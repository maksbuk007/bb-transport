import {
  state, $, $$, on, showMessage, clearForm, syncRouteSeatsFromBookings, getTodayDateString,
  getRouteFilter, getRouteStops, filterRoutes, resolveScheduleRoutes, statusClass, seatsBadge,
  getPassengerName
} from './core.js';

function getBookingParams() {
  const params = new URLSearchParams(location.search);
  return { book: params.get('book'), edit: params.get('edit') };
}

function clearBookingParams() {
  const url = new URL(location.href);
  url.searchParams.delete('book');
  url.searchParams.delete('edit');
  const query = url.searchParams.toString();
  history.replaceState(null, '', url.pathname + (query ? `?${query}` : ''));
}

function bookingPageUrl(routeId, editBookingId = null) {
  const params = new URLSearchParams({ book: routeId });
  if (editBookingId) params.set('edit', editBookingId);
  return `schedule.html?${params}`;
}



function emptyState(message) {
  return `<div class="empty-state">
    <img src="assets/icon-empty.svg" alt="" width="64" height="64">
    <p>${message}</p>
  </div>`;
}

function routeCard(route, { compact = false } = {}) {
  if (compact) {
    return `<article class="route-card route-card--compact">
      <div class="route-card__time route-card__time--dep"><strong>${route.departure}</strong><span>${route.from}</span></div>
      <div class="route-card__line"><span class="route-card__vehicle">${route.vehicle}</span><i aria-hidden="true"></i><span class="route-card__duration">${route.duration}</span></div>
      <div class="route-card__time route-card__time--arr"><strong>${route.arrival}</strong><span>${route.to}</span></div>
      <div class="route-card__status"><span class="status ${statusClass(route.status)}">${route.status}</span></div>
      <div class="route-card__meta"><span>Свободно</span><strong class="${seatsBadge(route)}">${route.freeSeats}/${route.totalSeats}</strong></div>
      <div class="route-card__price"><span>от</span><strong>${route.price} ${route.currency}</strong></div>
      <a class="button button--small route-card__button" href="schedule.html">Выбрать</a>
    </article>`;
  }
  return `<article class="route-card">
    <div class="route-card__time"><strong>${route.departure}</strong><span>${route.from}</span></div>
    <div class="route-card__line"><span>${route.duration}</span><i></i><b>${route.distance}</b></div>
    <div class="route-card__time"><strong>${route.arrival}</strong><span>${route.to}</span></div>
    <p class="route-card__driver">Водитель: ${route.driver} • ${route.vehicle}</p>
    <div class="route-card__meta"><span>Свободных мест</span><strong class="${seatsBadge(route)}">${route.freeSeats} / ${route.totalSeats}</strong></div>
    <div class="route-card__price"><span>Цена за место</span><strong>${route.price} ${route.currency}</strong></div>
    <button class="button route-card__button" type="button" data-book-route="${route.id}">Забронировать</button>
  </article>`;
}

function scheduleRow(route) {
  return `<tr>
    <td><b>${route.from} - ${route.to}</b><br><span class="muted">Платформа ${route.platform}</span></td>
    <td class="time-cell">${route.departure}</td>
    <td class="time-cell">${route.arrival}</td>
    <td>${route.vehicle}</td>
    <td><span class="${seatsBadge(route)}">${route.freeSeats}/${route.totalSeats}</span></td>
    <td><b>${route.price} ${route.currency}</b></td>
    <td><span class="status ${statusClass(route.status)}">${route.status}</span></td>
    <td><button class="button button--small" type="button" data-book-route="${route.id}">Выбрать</button></td>
  </tr>`;
}

function bookingCard(booking, route, isHistory = false) {
  const actions = isHistory ? '' : `<button class="button button--small" type="button" data-edit-booking="${booking.id}">Изменить</button>
    <button class="button button--small button--danger" type="button" data-cancel-booking="${booking.id}">Отменить</button>`;
  return `<article class="booking-card${isHistory ? ' booking-card--history' : ''}">
    <div class="route-card__time"><strong>${route.departure}</strong><span>${route.from}</span></div>
    <div class="route-card__line"><span>${route.duration}</span><i></i></div>
    <div class="route-card__time"><strong>${route.arrival}</strong><span>${route.to}</span></div>
    <div class="booking-card__info">
      <span>Номер: <b>${booking.id}</b></span>
      <span>Посадка: <b>${booking.boardingStop || 'не выбрано'}</b></span>
      <span>Места: ${booking.seats.map(s => `<b class="badge">${s}</b>`).join(' ')}</span>
    </div>
    <strong class="status ${statusClass(booking.status)}">${booking.status}</strong>
    <div class="booking-card__sum"><span>Сумма</span><strong>${booking.total} ${booking.currency}</strong></div>
    <div class="actions booking-card__actions">${actions}</div>
  </article>`;
}

export function renderHomeRoutes() {
  const list = $('[data-home-routes]');
  if (!list) return;
  let upcoming = filterRoutes(state.routes, { tripDate: getTodayDateString() })
    .sort((a, b) => a.departure.localeCompare(b.departure));
  if (!upcoming.length) {
    upcoming = [...state.routes].sort((a, b) => a.departure.localeCompare(b.departure));
  }
  list.innerHTML = upcoming.slice(0, 6).length
    ? upcoming.slice(0, 6).map(r => routeCard(r, { compact: true })).join('')
    : emptyState('Рейсы пока не загружены.');
}

const HOME_SEARCH_LIMIT = 5;

export function renderHomeSearchResults(items, { resetExpand = false } = {}) {
  const section = $('[data-routes-section]');
  const list = $('[data-routes-list]');
  const countNode = $('[data-routes-count]');
  const moreBtn = $('[data-show-all-routes]');
  if (!list) return;

  if (resetExpand) state.homeSearchExpanded = false;
  state.homeSearchResults = items;

  if (!items?.length) {
    section?.removeAttribute('hidden');
    list.innerHTML = emptyState('По выбранному направлению рейсы не найдены.');
    countNode?.setAttribute('hidden', '');
    moreBtn?.setAttribute('hidden', '');
    return;
  }

  section?.removeAttribute('hidden');
  countNode?.removeAttribute('hidden');
  if (countNode) countNode.textContent = `Найдено рейсов: ${items.length}`;

  const showAll = state.homeSearchExpanded || items.length <= HOME_SEARCH_LIMIT;
  const visible = showAll ? items : items.slice(0, HOME_SEARCH_LIMIT);
  list.innerHTML = visible.map(r => routeCard(r)).join('');
  bindBookButtons(list);

  if (moreBtn) {
    const hasMore = items.length > HOME_SEARCH_LIMIT;
    if (hasMore && !state.homeSearchExpanded) {
      moreBtn.removeAttribute('hidden');
      moreBtn.onclick = () => {
        state.homeSearchExpanded = true;
        renderHomeSearchResults(items);
      };
    } else {
      moreBtn.setAttribute('hidden', '');
      moreBtn.onclick = null;
    }
  }
}

export function renderSchedule(routes = state.routes) {
  const table = $('[data-schedule-table]');
  if (!table) return;

  const items = resolveScheduleRoutes(state.routes, routes);
  const emptyRow = '<tr><td colspan="8">По выбранному направлению рейсы не найдены.</td></tr>';
  table.innerHTML = items.length ? items.map(scheduleRow).join('') : emptyRow;
  bindBookButtons(table);
}

function bindBookButtons(root) {
  on(root, '[data-book-route]', el => {
    document.dispatchEvent(new CustomEvent('app:book-route', { detail: el.dataset.bookRoute }));
  });
}

export function initBookingForm() {
  const form = $('[data-booking-form]');
  if (!form) return;

  $('[data-close-booking]')?.addEventListener('click', closeBookingPanel);
  $('[data-swap-booking-route]')?.addEventListener('click', swapBookingRoute);
  form.elements.passengers.addEventListener('input', updateSeatSummary);
  form.addEventListener('submit', e => { e.preventDefault(); submitBooking(form); });

  const { book, edit } = getBookingParams();
  if (book) {
    clearBookingParams();
    bookRoute(book, edit);
  }
}

export function bookRoute(routeId, editBookingId = null) {
  const route = state.routes.find(r => r.id === routeId);
  const form = $('[data-booking-form]');
  const panel = $('[data-booking-panel]');
  if (!route || !form || !panel) {
    location.href = bookingPageUrl(routeId, editBookingId);
    return;
  }

  const booking = editBookingId ? state.bookings.find(b => b.id === editBookingId) : null;
  const filter = getRouteFilter() || {};
  state.activeRouteId = routeId;
  state.editBookingId = editBookingId;
  state.selectedSeats = booking ? [...booking.seats] : [];

  form.elements.routeId.value = routeId;
  form.elements.bookingId.value = editBookingId || '';
  form.elements.passenger.value = booking?.passenger || '';
  form.elements.phone.value = booking?.phone || '';
  form.elements.passengers.value = Math.max(1, state.selectedSeats.length || Number(filter.passengers || 1));
  fillStops(form.elements.boardingStop, route.stops, booking?.boardingStop || filter.boardingStop);

  $('[data-booking-title]').textContent = `${route.from} - ${route.to}, ${route.departure}`;
  panel.hidden = false;
  renderSeatMap(route, booking);
  updateSeatSummary();
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fillStops(select, stops, selected = '') {
  select.innerHTML = stops.map(s => `<option value="${s}">${s}</option>`).join('');
  if (selected && stops.includes(selected)) select.value = selected;
}

function swapBookingRoute() {
  const cur = state.routes.find(r => r.id === state.activeRouteId);
  if (!cur) return;
  const opp = state.routes.find(r => r.from === cur.to && r.to === cur.from && r.departure === cur.departure)
    || state.routes.find(r => r.from === cur.to && r.to === cur.from);
  if (!opp) return showMessage('Обратное направление не найдено.');
  bookRoute(opp.id);
}

function renderSeatMap(route, editedBooking = null) {
  const map = $('[data-seat-map]');
  if (!map) return;
  const busy = new Set(
    state.bookings
      .filter(b => b.routeId === route.id && b.id !== editedBooking?.id && b.status !== 'Бронирование отменено')
      .flatMap(b => b.seats)
  );

  map.innerHTML = Array.from({ length: route.totalSeats }, (_, i) => {
    const seat = String(i + 1);
    const isBusy = busy.has(seat);
    const isSel = state.selectedSeats.includes(seat);
    const cls = isBusy ? 'seat--busy' : isSel ? 'seat--selected' : 'seat--free';
    return `<button class="seat ${cls}" type="button" data-seat="${seat}" ${isBusy ? 'disabled' : ''}>${seat}</button>`;
  }).join('');

  map.querySelectorAll('[data-seat]').forEach(btn => btn.addEventListener('click', () => toggleSeat(btn.dataset.seat, route)));
}

function toggleSeat(seat, route) {
  const limit = Math.min(4, Number($('[data-booking-form]')?.elements.passengers.value || 1));
  const idx = state.selectedSeats.indexOf(seat);
  if (idx >= 0) state.selectedSeats.splice(idx, 1);
  else if (state.selectedSeats.length < limit) state.selectedSeats.push(seat);
  else return showMessage(`Можно выбрать не больше ${limit} мест.`);
  renderSeatMap(route);
  updateSeatSummary();
}

function updateSeatSummary() {
  const form = $('[data-booking-form]');
  const summary = $('[data-booking-summary]');
  const route = state.routes.find(r => r.id === state.activeRouteId);
  if (!form || !summary || !route) return;
  const passengers = Number(form.elements.passengers.value || 1);
  if (state.selectedSeats.length > passengers) {
    state.selectedSeats = state.selectedSeats.slice(0, passengers);
    renderSeatMap(route);
  }
  summary.innerHTML = `
    <span>Выбрано мест: <b>${state.selectedSeats.length}/${passengers}</b></span>
    <span>Места: <b>${state.selectedSeats.join(', ') || 'не выбраны'}</b></span>
    <span>Итого: <b>${state.selectedSeats.length * route.price} ${route.currency}</b></span>`;
}

function submitBooking(form) {
  const route = state.routes.find(r => r.id === form.elements.routeId.value);
  if (!route) return;
  const btn = form.querySelector('[type="submit"]');
  btn?.classList.add('button--loading');
  const passengers = Number(form.elements.passengers.value || 1);
  if (state.selectedSeats.length !== passengers) {
    btn?.classList.remove('button--loading');
    return showMessage('Выберите количество мест, равное числу пассажиров.');
  }

  const existing = state.bookings.find(b => b.id === form.elements.bookingId.value);
  const prevSeats = existing && existing.status !== 'Бронирование отменено' ? existing.seats.length : 0;
  const booking = existing || { id: 'b' + Date.now(), routeId: route.id, status: 'Ожидает посадки', currency: route.currency };

  Object.assign(booking, {
    passenger: form.elements.passenger.value.trim(),
    phone: form.elements.phone.value.trim(),
    boardingStop: form.elements.boardingStop.value,
    seats: [...state.selectedSeats],
    total: state.selectedSeats.length * route.price
  });
  if (!existing) state.bookings.push(booking);

  route.freeSeats = Math.max(0, Math.min(route.totalSeats, route.freeSeats + prevSeats - booking.seats.length));
  btn?.classList.remove('button--loading');
  clearForm(form);
  form.elements.passengers.value = '1';
  closeBookingPanel();
  refreshAll();
  showMessage(existing ? 'Бронирование изменено.' : 'Бронирование создано.');
}

function closeBookingPanel() {
  const panel = $('[data-booking-panel]');
  const form = $('[data-booking-form]');
  if (panel) panel.hidden = true;
  clearForm(form);
  if (form) form.elements.passengers.value = '1';
  state.selectedSeats = [];
  state.activeRouteId = null;
  state.editBookingId = null;
}

function initSearchStops(form) {
  const update = () => {
    const select = form.querySelector('[data-boarding-stop], [data-booking-stop]');
    if (!select) return;
    fillStops(select, getRouteStops(form.elements.from.value.trim(), form.elements.to.value.trim()));
  };
  form.querySelector('[data-swap-route]')?.addEventListener('click', () => {
    const a = form.elements.from.value;
    form.elements.from.value = form.elements.to.value;
    form.elements.to.value = a;
    update();
  });
  ['input', 'change'].forEach(evt => {
    form.elements.from.addEventListener(evt, update);
    form.elements.to.addEventListener(evt, update);
  });
  update();
}

export function renderBookings() {
  const activeList = $('[data-bookings-list]');
  const historyList = $('[data-bookings-history]');
  const counter = $('[data-bookings-count]');
  if (!activeList) return;

  const name = getPassengerName();
  const all = state.bookings.filter(b => b.passenger === name);
  const active = all.filter(b => b.status !== 'Бронирование отменено');
  const history = all.filter(b => b.status === 'Бронирование отменено');

  if (counter) counter.textContent = `${active.length} активных бронирований`;
  activeList.innerHTML = active.length ? active.map(b => card(b)).join('') : emptyState('Активных бронирований пока нет.');
  if (historyList) {
    historyList.innerHTML = history.length ? history.map(b => card(b, true)).join('') : emptyState('История поездок пока пуста.');
  }
  bindActions(activeList);
  if (historyList) bindActions(historyList);
}

function card(booking, history = false) {
  const route = state.routes.find(r => r.id === booking.routeId);
  return route ? bookingCard(booking, route, history) : '';
}

function bindActions(list) {
  on(list, '[data-cancel-booking]', el => cancelBooking(el.dataset.cancelBooking));
  on(list, '[data-edit-booking]', el => {
    const b = state.bookings.find(x => x.id === el.dataset.editBooking);
    if (!b) return;
    location.href = bookingPageUrl(b.routeId, b.id);
  });
}

function cancelBooking(id) {
  const booking = state.bookings.find(b => b.id === id);
  if (!booking) return;
  booking.status = 'Бронирование отменено';
  const route = state.routes.find(r => r.id === booking.routeId);
  if (route) route.freeSeats = Math.min(route.totalSeats, route.freeSeats + booking.seats.length);
  refreshAll();
  showMessage('Бронирование отменено');
}

export function initSearchForm() {
  const form = $('[data-search-form]');
  if (!form) return;
  const today = getTodayDateString();
  const dateInput = form.elements.date;
  if (dateInput) {
    dateInput.min = today;
    if (!dateInput.value || dateInput.value < today) dateInput.value = today;
    dateInput.addEventListener('change', () => {
      if (dateInput.value < today) {
        dateInput.value = today;
        showMessage('Нельзя выбрать дату в прошлом');
      }
    });
  }
  initSearchStops(form);
  form.addEventListener('submit', e => {
    e.preventDefault();
    const tripDate = form.elements.date?.value || today;
    if (tripDate < today) return showMessage('Нельзя выбрать дату в прошлом');
    const filtered = filterRoutes(state.routes, {
      from: form.elements.from.value.trim().toLowerCase(),
      to: form.elements.to.value.trim().toLowerCase(),
      passengers: Number(form.elements.passengers?.value || 1),
      tripDate
    });
    state.routeFilter = {
      from: form.elements.from.value.trim().toLowerCase(),
      to: form.elements.to.value.trim().toLowerCase(),
      date: tripDate,
      passengers: Number(form.elements.passengers?.value || 1),
      boardingStop: form.elements.boardingStop?.value || ''
    };
    renderHomeSearchResults(filtered, { resetExpand: true });
    resetSearchForm(form);
    $('#routes')?.scrollIntoView({ behavior: 'smooth' });
  });
}

function resetSearchForm(form) {
  const today = getTodayDateString();
  form.elements.from.value = 'Минск';
  form.elements.to.value = 'Солигорск';
  if (form.elements.date) form.elements.date.value = today;
  if (form.elements.passengers) form.elements.passengers.value = '1';
  const select = form.querySelector('[data-boarding-stop]');
  if (select && select.options.length) select.selectedIndex = 0;
}

export function refreshAll() {
  syncRouteSeatsFromBookings();
  renderHomeRoutes();
  if (state.homeSearchResults) renderHomeSearchResults(state.homeSearchResults);
  renderSchedule();
  renderBookings();
  import('./staff.js').then(m => { m.renderAdmin(); m.renderDriver(); });
}

