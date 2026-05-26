// Конфигурация, состояние, утилиты, XML, фильтры, хранилище

export const DATA_PATHS = {
  routes: 'data/routes.xml?v=7',
  bookings: 'data/bookings.xml?v=4',
  users: 'data/users.xml?v=2'
};

export const TRIP_DURATION_MINUTES = 105;

export const FLEET_DRIVERS = [
  'Сергей Иванов',
  'Андрей Ковалёв',
  'Наталья Петрова',
  'Дмитрий Жук',
  'Игорь Лукашевич',
  'Ольга Семёнова',
  'Виктор Мельников',
  'Татьяна Горбунова'
];

export const FLEET_VEHICLES = [
  'Mercedes-Benz Sprinter',
  'MAN Lion\'s Coach',
  'Neoplan Tourliner',
  'МАЗ 107466',
  'Iveco Crossway 12M',
  'Volkswagen Crafter 55',
  'Setra S 515 HD',
  'Scania Touring HD',
  'Yutong ZK6128H',
  'Golden Dragon XML6127'
];
export function getDemoPassengerName() {
  return state.users.find(u => u.role === 'passenger')?.name || 'Букатин Максимилиан';
}

export function getDemoDriverName() {
  return state.users.find(u => u.role === 'driver')?.name || FLEET_DRIVERS[0];
}

/** В демо всегда показываем бронирования пассажира из XML */
export function getPassengerName() {
  return getDemoPassengerName();
}

function dataUrl(file) {
  return new URL(file, window.location.href).href;
}

export const ROUTE_STOPS = {
  'Минск-Солигорск': [
    'ст."Дружная"', 'Ин.Культ.', 'г.Спутник', 'Коротк.', 'Вирская', 'Казинца',
    'Брестская', 'Рижская', 'БСП', 'ДБ', 'Ваз после +', 'Сеница', 'Мачулищи',
    'Самохв.', 'Белица', 'Пятевщина', 'Вишневка', 'Озеро', 'Королёво',
    'Дещенка', 'Володьки', 'Валерьяны', 'Горбаты', 'Б.Лужа', 'Гацук',
    'Б.Греск', 'Шищицы', 'Леньки', 'Городище', 'Маглыши'
  ],
  'Солигорск-Минск': [
    'Покровка', 'ст.Строит.', 'Окт.15', 'маг.N18', 'н.Вокзала', 'Ланд.',
    'н.Случа', 'Техн.', 'маг."Мартин"', 'Корона', 'Славия', 'Дом пионеров',
    'Набер.246', 'Спелео', 'сан.Березка', 'Насосн.', 'Поликл.', 'н.Фонтана',
    'Зубн.', 'Суд', 'Засл.61', 'Староб.', 'Засл.93', 'Ков.21', 'Рад.Судил.',
    'Мол.7', 'Мол.1', 'Окт.95', 'н.Солн.', 'Пр.Мира', 'Кулаки', 'Подосин.',
    'Жабин', 'Радково ост.', 'Чепели', 'пов. Пруссы', 'Млынка', 'Бел.-Чал.'
  ]
};

export const state = {
  routes: [],
  bookings: [],
  users: [],
  selectedSeats: [],
  activeRouteId: null,
  editBookingId: null,
  routeFilter: null,
  homeSearchResults: null,
  homeSearchExpanded: false,
  driverSearchQuery: '',
  driverSort: 'time-asc',
  adminSearchQuery: ''
};

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const getText = (parent, sel) => parent.querySelector(sel)?.textContent.trim() || '';

export function showMessage(text) {
  const node = $('[data-message]');
  if (!node) return alert(text);
  node.textContent = text;
  node.classList.add('toast--visible');
  setTimeout(() => node.classList.remove('toast--visible'), 3500);
}

export function on(root, selector, handler) {
  if (!root) return;
  $$(selector, root).forEach(el => el.addEventListener('click', () => handler(el)));
}

export function formatDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const getTodayDateString = () => formatDateInput(new Date());

export function matchSearch(query, ...fields) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some(value => String(value ?? '').toLowerCase().includes(q));
}

export const parseTimeToMinutes = time => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export function addMinutes(time, minutes) {
  const total = parseTimeToMinutes(time) + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export const formatHour = hour => `${String(hour % 24).padStart(2, '0')}:00`;

export function statusClass(status) {
  // Модификаторы для статусов в разных частях UI:
  // - для рейсов (расписание/карточки)
  // - для бронирований (кабинет пассажира)
  if (status === 'Задержан' || status === 'Ожидает посадки') return 'status--warning';
  if (status === 'Отправлен') return 'status--muted';
  if (status === 'Бронирование отменено') return 'status--danger';
  return '';
}

export const seatsBadge = route => (route.freeSeats < 10 ? 'badge badge--muted' : 'badge');

export const optionTag = (cur, val) => `<option value="${val}"${cur === val ? ' selected' : ''}>${val}</option>`;

export const getRouteFilter = () => state.routeFilter;

export function getRouteStops(from, to) {
  const f = from.trim().toLowerCase();
  const t = to.trim().toLowerCase();
  const key = Object.keys(ROUTE_STOPS).find(k => {
    const [a, b] = k.split('-');
    return a.toLowerCase() === f && b.toLowerCase() === t;
  });
  return key ? ROUTE_STOPS[key] : [];
}

export function getSelectedTripDate() {
  const form = document.querySelector('[data-search-form]');
  const stored = getRouteFilter();
  return form?.elements.date?.value || stored?.date || getTodayDateString();
}

export function isRouteDeparted(route, tripDate) {
  const today = getTodayDateString();
  if (tripDate < today) return true;
  if (tripDate > today) return false;
  const now = new Date();
  return parseTimeToMinutes(route.departure) < now.getHours() * 60 + now.getMinutes();
}

export function filterRoutes(routes, { from, to, passengers, tripDate } = {}) {
  const date = tripDate || getSelectedTripDate();
  const f = from?.trim().toLowerCase();
  const t = to?.trim().toLowerCase();
  const p = Number(passengers || 0);
  return routes.filter(route => {
    if (f && !route.from.toLowerCase().includes(f)) return false;
    if (t && !route.to.toLowerCase().includes(t)) return false;
    if (p && route.freeSeats < p) return false;
    if (isRouteDeparted(route, date)) return false;
    return true;
  });
}

export function resolveScheduleRoutes(allRoutes, routes = allRoutes) {
  const stored = getRouteFilter();
  if (routes === allRoutes) {
    if (!stored) return allRoutes;
    return filterRoutes(allRoutes, {
      from: stored.from,
      to: stored.to,
      passengers: stored.passengers,
      tripDate: stored.date || getTodayDateString()
    });
  }
  return filterRoutes(routes, { tripDate: stored?.date || getSelectedTripDate() });
}

export function clearForm(form) {
  if (!form) return;
  form.reset();
  form.querySelectorAll('input[type="hidden"]').forEach(el => { el.value = ''; });
}

export function syncRouteSeatsFromBookings() {
  state.routes.forEach(route => {
    const occupied = state.bookings
      .filter(b => b.routeId === route.id && b.status !== 'Бронирование отменено')
      .reduce((sum, b) => sum + b.seats.length, 0);
    route.freeSeats = Math.max(0, route.totalSeats - occupied);
  });
}

export function purgeLegacyStorage() {
  ['transithubBookings', 'transithubRoutes', 'transithubRoutesMinskSoligorsk', 'transithubRoutesHourlyStopsV2', 'transithubRoutesHourlyStopsV3']
    .forEach(key => localStorage.removeItem(key));
  ['routeFilter', 'routeToBook', 'editBookingId'].forEach(key => sessionStorage.removeItem(key));
}

async function loadXml(path) {
  const res = await fetch(dataUrl(path));
  if (!res.ok) throw new Error('Ошибка загрузки: ' + path);
  const doc = new DOMParser().parseFromString(await res.text(), 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Ошибка разбора XML: ' + path);
  return doc;
}

function createHourlyRoutes(baseRoutes) {
  return baseRoutes.flatMap(route => {
    const start = route.from === 'Солигорск' ? 5 : 7;
    const end = route.from === 'Солигорск' ? 22 : 24;
    return Array.from({ length: end - start + 1 }, (_, i) => {
      const departure = formatHour(start + i);
      const slot = start + i;
      const variant = route.from === 'Солигорск' ? 3 : 0;
      return {
        ...route,
        id: `${route.id}-${departure.replace(':', '')}`,
        departure,
        arrival: addMinutes(departure, TRIP_DURATION_MINUTES),
        duration: '1ч 45м',
        driver: FLEET_DRIVERS[(slot + variant) % FLEET_DRIVERS.length],
        vehicle: FLEET_VEHICLES[(slot + variant * 2 + i) % FLEET_VEHICLES.length],
        platform: String((i % 4) + 1),
        stops: getRouteStops(route.from, route.to)
      };
    });
  });
}

export async function loadAllData() {
  const [routesXml, bookingsXml, usersXml] = await Promise.all([
    loadXml(DATA_PATHS.routes),
    loadXml(DATA_PATHS.bookings),
    loadXml(DATA_PATHS.users)
  ]);

  return {
    routes: createHourlyRoutes([...routesXml.querySelectorAll('route')].map(route => ({
      id: route.getAttribute('id'),
      from: getText(route, 'from'),
      to: getText(route, 'to'),
      departure: getText(route, 'departure'),
      arrival: getText(route, 'arrival'),
      duration: getText(route, 'duration'),
      distance: getText(route, 'distance'),
      driver: getText(route, 'driver'),
      vehicle: getText(route, 'vehicle'),
      freeSeats: Number(getText(route, 'freeSeats')),
      totalSeats: Number(getText(route, 'totalSeats')),
      price: Number(getText(route, 'price')),
      currency: route.querySelector('price').getAttribute('currency'),
      platform: getText(route, 'platform'),
      status: getText(route, 'status') || 'Ожидается'
    }))),
    bookings: [...bookingsXml.querySelectorAll('booking')].map(b => ({
      id: b.getAttribute('id'),
      routeId: b.getAttribute('routeId'),
      passenger: getText(b, 'passenger'),
      phone: getText(b, 'phone'),
      boardingStop: getText(b, 'boardingStop') || 'не выбрано',
      seats: [...b.querySelectorAll('seat')].map(s => s.textContent),
      status: getText(b, 'status'),
      total: Number(getText(b, 'total')),
      currency: b.querySelector('total').getAttribute('currency')
    })),
    users: [...usersXml.querySelectorAll('user')].map(u => ({
      id: u.getAttribute('id'),
      role: u.getAttribute('role'),
      name: getText(u, 'name'),
      email: getText(u, 'email'),
      login: getText(u, 'login'),
      password: getText(u, 'password')
    }))
  };
}
