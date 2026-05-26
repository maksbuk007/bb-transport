import {
  state, $, $$, on, showMessage, optionTag, matchSearch, getDemoDriverName
} from './core.js';
import { renderSchedule, renderHomeRoutes, renderBookings, refreshAll } from './passenger.js';

function adminSearchQuery() {
  return ($('[data-admin-search]')?.value || state.adminSearchQuery || '').trim();
}

function bookingMatchesAdminSearch(booking, route, query) {
  return matchSearch(
    query,
    booking.id,
    booking.passenger,
    booking.phone,
    booking.boardingStop,
    booking.seats.join(' '),
    booking.status,
    booking.total,
    route?.from,
    route?.to,
    route?.departure,
    route?.driver,
    route?.vehicle
  );
}

function routeMatchesAdminSearch(route, query) {
  return matchSearch(
    query,
    route.id,
    route.from,
    route.to,
    route.departure,
    route.arrival,
    route.driver,
    route.vehicle,
    route.status,
    route.platform,
    route.price
  );
}

function getAdminRoutes() {
  const query = adminSearchQuery();
  return state.routes.filter(route => routeMatchesAdminSearch(route, query));
}

function getAdminBookings() {
  const query = adminSearchQuery();
  return state.bookings.filter(booking => {
    const route = state.routes.find(r => r.id === booking.routeId);
    return bookingMatchesAdminSearch(booking, route, query);
  });
}

export function renderAdmin() {
  const body = $('[data-admin-routes]');
  const stats = $('[data-admin-stats]');
  if (!body) return;

  const routes = getAdminRoutes();
  const bookings = getAdminBookings();
  const income = state.bookings.reduce((s, b) => s + b.total, 0);
  const freeSeats = state.routes.reduce((s, r) => s + r.freeSeats, 0);
  if (stats) {
    stats.innerHTML = `
      <article><span>Рейсов</span><strong>${state.routes.length}</strong></article>
      <article><span>Бронирований</span><strong>${state.bookings.length}</strong></article>
      <article><span>Выручка</span><strong>${income} BYN</strong></article>
      <article><span>Свободных мест</span><strong>${freeSeats}</strong></article>`;
  }

  body.innerHTML = routes.length
    ? routes.map(route => `
    <tr data-route-row="${route.id}">
      <td><input class="table-input" name="from" value="${route.from}"><input class="table-input" name="to" value="${route.to}"></td>
      <td><input class="table-input table-input--short" name="departure" value="${route.departure}"> - <input class="table-input table-input--short" name="arrival" value="${route.arrival}"></td>
      <td><input class="table-input" name="driver" value="${route.driver}"><input class="table-input" name="vehicle" value="${route.vehicle}"></td>
      <td><input class="table-input table-input--short" name="freeSeats" type="number" value="${route.freeSeats}"> / <input class="table-input table-input--short" name="totalSeats" type="number" value="${route.totalSeats}"></td>
      <td><input class="table-input table-input--short" name="price" type="number" value="${route.price}"></td>
      <td><select class="table-input" name="status">${optionTag(route.status, 'Ожидается')}${optionTag(route.status, 'Задержан')}${optionTag(route.status, 'Отправлен')}</select></td>
      <td><button class="button button--small" type="button" data-save-route="${route.id}">Сохранить</button></td>
    </tr>`).join('')
    : '<tr><td colspan="7">По запросу ничего не найдено</td></tr>';

  on(body, '[data-save-route]', el => saveRoute(el.dataset.saveRoute));
  renderReports();
  renderPassengers(bookings);
}

function renderReports() {
  const box = $('[data-admin-reports]');
  if (!box) return;
  const income = state.bookings.filter(b => b.status !== 'Бронирование отменено').reduce((s, b) => s + b.total, 0);
  const occupied = state.routes.reduce((s, r) => s + r.totalSeats - r.freeSeats, 0);
  const total = state.routes.reduce((s, r) => s + r.totalSeats, 0);
  const pct = total ? Math.round((occupied / total) * 100) : 0;
  const confirmed = state.bookings.filter(b => b.status === 'Посадка подтверждена').length;
  box.innerHTML = `
    <article><h3>Заполняемость автопарка</h3><p>Средняя загрузка мест</p><strong>${pct}%</strong></article>
    <article><h3>Выручка</h3><p>Активные бронирования</p><strong>${income} BYN</strong></article>
    <article><h3>Подтверждённые посадки</h3><p>По данным водителя</p><strong>${confirmed}</strong></article>`;
}

function renderPassengers(bookings = getAdminBookings()) {
  const body = $('[data-admin-passengers]');
  if (!body) return;
  body.innerHTML = bookings.length
    ? bookings.map(b => {
      const route = state.routes.find(r => r.id === b.routeId);
      return `<tr data-booking-row="${b.id}">
      <td><input class="table-input" name="passenger" value="${b.passenger}"></td>
      <td><input class="table-input" name="phone" value="${b.phone}"></td>
      <td>${route ? `${route.from} - ${route.to}` : 'Рейс удалён'}</td>
      <td><input class="table-input table-input--short" name="seats" value="${b.seats.join(', ')}"></td>
      <td><select class="table-input" name="status">${optionTag(b.status, 'Ожидает посадки')}${optionTag(b.status, 'Подтверждено')}${optionTag(b.status, 'Посадка подтверждена')}${optionTag(b.status, 'Посадка отменена')}</select></td>
      <td><input class="table-input table-input--short" name="total" type="number" value="${b.total}"></td>
      <td><div class="actions">
        <button class="button button--small" type="button" data-save-booking="${b.id}">Сохранить</button>
        <button class="button button--small button--danger" type="button" data-delete-booking="${b.id}">Удалить</button>
      </div></td></tr>`;
    }).join('')
    : '<tr><td colspan="7">По запросу ничего не найдено</td></tr>';
  on(body, '[data-save-booking]', el => saveBooking(el.dataset.saveBooking));
  on(body, '[data-delete-booking]', el => deleteBooking(el.dataset.deleteBooking));
}

function saveRoute(id) {
  const row = $(`[data-route-row="${id}"]`);
  const route = state.routes.find(r => r.id === id);
  if (!row || !route) return;
  route.from = row.querySelector('[name="from"]').value.trim();
  route.to = row.querySelector('[name="to"]').value.trim();
  route.departure = row.querySelector('[name="departure"]').value.trim();
  route.arrival = row.querySelector('[name="arrival"]').value.trim();
  route.driver = row.querySelector('[name="driver"]').value.trim();
  route.vehicle = row.querySelector('[name="vehicle"]').value.trim();
  route.totalSeats = Number(row.querySelector('[name="totalSeats"]').value);
  route.freeSeats = Math.min(route.totalSeats, Number(row.querySelector('[name="freeSeats"]').value));
  route.price = Number(row.querySelector('[name="price"]').value);
  route.status = row.querySelector('[name="status"]').value;
  renderAdmin();
  renderSchedule();
  renderDriver();
  showMessage('Рейс сохранён');
}

function saveBooking(id) {
  const row = $(`[data-booking-row="${id}"]`);
  const booking = state.bookings.find(b => b.id === id);
  if (!row || !booking) return;
  booking.passenger = row.querySelector('[name="passenger"]').value;
  booking.phone = row.querySelector('[name="phone"]').value;
  booking.seats = row.querySelector('[name="seats"]').value.split(',').map(s => s.trim()).filter(Boolean);
  booking.status = row.querySelector('[name="status"]').value;
  booking.total = Number(row.querySelector('[name="total"]').value);
  refreshAll();
  showMessage('Данные пассажира сохранены (демо: после перезагрузки вернутся из XML)');
}

function deleteBooking(id) {
  state.bookings = state.bookings.filter(b => b.id !== id);
  refreshAll();
  showMessage('Бронирование удалено');
}

export function initRouteForm() {
  const form = $('[data-route-form]');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const totalSeats = Number(form.elements.totalSeats.value);
    state.routes.push({
      id: 'r' + Date.now(),
      from: form.elements.from.value.trim(),
      to: form.elements.to.value.trim(),
      departure: form.elements.departure.value,
      arrival: form.elements.arrival.value,
      duration: '1ч 45м',
      distance: 'уточняется',
      driver: form.elements.driver.value.trim(),
      vehicle: form.elements.vehicle.value.trim(),
      freeSeats: Math.min(totalSeats, Number(form.elements.freeSeats.value)),
      totalSeats,
      price: Number(form.elements.price.value),
      currency: 'BYN',
      platform: form.elements.platform.value.trim(),
      status: 'Ожидается',
      stops: []
    });
    renderAdmin();
    renderSchedule();
    form.reset();
    showMessage('Рейс добавлен');
  });
}

function driverSearchQuery() {
  return ($('[data-driver-search]')?.value || state.driverSearchQuery || '').trim();
}

function driverSortValue() {
  return $('[data-driver-sort]')?.value || state.driverSort || 'time-asc';
}

function sortDriverRoutes(routes, sortKey) {
  const sorted = [...routes];
  switch (sortKey) {
    case 'time-desc':
      return sorted.sort((a, b) => b.departure.localeCompare(a.departure));
    case 'route-asc':
      return sorted.sort((a, b) => `${a.from} ${a.to}`.localeCompare(`${b.from} ${b.to}`, 'ru'));
    case 'passengers-desc':
      return sorted.sort((a, b) => {
        const count = id => state.bookings.filter(x => x.routeId === id && x.status !== 'Бронирование отменено').length;
        return count(b.id) - count(a.id);
      });
    default:
      return sorted.sort((a, b) => a.departure.localeCompare(b.departure));
  }
}

function filterDriverTrip(route, passengers, query) {
  if (!query) return { route, passengers };

  const routeMatch = matchSearch(
    query,
    route.from,
    route.to,
    route.departure,
    route.arrival,
    route.vehicle,
    route.platform,
    route.status
  );

  const matchedPassengers = passengers.filter(b =>
    matchSearch(query, b.passenger, b.phone, b.id, b.boardingStop, b.seats.join(' '), b.status)
  );

  if (routeMatch) return { route, passengers };
  if (matchedPassengers.length) return { route, passengers: matchedPassengers };
  return null;
}

export function renderDriver() {
  const list = $('[data-driver-list]');
  if (!list) return;

  const query = driverSearchQuery();
  const sortKey = driverSortValue();
  const driver = getDemoDriverName();
  const trips = sortDriverRoutes(
    state.routes.filter(r => r.driver === driver),
    sortKey
  )
    .map(route => {
      const passengers = state.bookings.filter(
        b => b.routeId === route.id && b.status !== 'Бронирование отменено'
      );
      return filterDriverTrip(route, passengers, query);
    })
    .filter(Boolean);

  const counter = $('[data-driver-count]');
  if (counter) {
    const n = trips.length;
    if (!n) {
      counter.textContent = `${driver} • нет рейсов на смене`;
    } else {
      const mod10 = n % 10;
      const mod100 = n % 100;
      const word = mod10 === 1 && mod100 !== 11 ? 'рейс'
        : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'рейса' : 'рейсов';
      counter.textContent = `${driver} • ${n} ${word} на смене`;
    }
  }

  list.innerHTML = trips.length
    ? trips.map(({ route, passengers }) => `
        <article class="driver-card">
          <div><h2>${route.departure} ${route.from} - ${route.to}</h2><p>Автобус: ${route.vehicle}, платформа ${route.platform}</p></div>
          <span class="badge">${route.freeSeats}/${route.totalSeats}</span>
          <div class="passenger-list">${passengers.map(passengerRow).join('') || '<p class="muted">Пассажиров по брони пока нет</p>'}</div>
        </article>`).join('')
    : `<div class="empty-state">
        <img src="assets/icon-empty.svg" alt="" width="64" height="64">
        <p>${query ? 'По запросу поездки не найдены' : 'Назначенных рейсов пока нет'}</p>
      </div>`;

  on(list, '[data-driver-status]', el => setStatus(el.dataset.driverStatus, el.dataset.bookingId));
}

function passengerRow(booking) {
  return `<div class="passenger-row">
    <div><strong>${booking.passenger}</strong>
      <span>Посадка: ${booking.boardingStop || 'не выбрано'}</span>
      <span>Место ${booking.seats.join(', ')} • ${booking.phone}</span>
      <em>${booking.status}</em></div>
    <div class="actions">
      <button class="button button--small" type="button" data-driver-status="Посадка подтверждена" data-booking-id="${booking.id}">Подтвердить</button>
      <button class="button button--small button--danger" type="button" data-driver-status="Посадка отменена" data-booking-id="${booking.id}">Отменить</button>
    </div></div>`;
}

function setStatus(status, id) {
  const booking = state.bookings.find(b => b.id === id);
  if (!booking) return;
  booking.status = status;
  renderDriver();
  renderBookings();
  renderSchedule();
  renderHomeRoutes();
  renderAdmin();
  showMessage('Статус посадки обновлён');
}

export function initStaffControls() {
  const adminSearch = $('[data-admin-search]');
  if (adminSearch) {
    adminSearch.value = state.adminSearchQuery;
    adminSearch.addEventListener('input', () => {
      state.adminSearchQuery = adminSearch.value;
      renderAdmin();
    });
  }

  const driverSearch = $('[data-driver-search]');
  const driverSort = $('[data-driver-sort]');
  if (driverSearch) {
    driverSearch.value = state.driverSearchQuery;
    driverSearch.addEventListener('input', () => {
      state.driverSearchQuery = driverSearch.value;
      renderDriver();
    });
  }
  if (driverSort) {
    driverSort.value = state.driverSort;
    driverSort.addEventListener('change', () => {
      state.driverSort = driverSort.value;
      renderDriver();
    });
  }
}
