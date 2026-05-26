import { state, loadAllData, purgeLegacyStorage, syncRouteSeatsFromBookings, showMessage } from './core.js';
import {
  initSearchForm, initBookingForm, bookRoute,
  renderHomeRoutes, renderSchedule, renderBookings
} from './passenger.js';
import { renderAdmin, renderDriver, initRouteForm, initStaffControls } from './staff.js';

document.addEventListener('app:book-route', e => bookRoute(e.detail));

function initAppUi() {
  renderHomeRoutes();
  renderSchedule();
  renderBookings();
  renderAdmin();
  renderDriver();
  initSearchForm();
  initBookingForm();
  initRouteForm();
  initStaffControls();
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    Object.assign(state, await loadAllData());
    purgeLegacyStorage();
    syncRouteSeatsFromBookings();
  } catch (err) {
    console.error(err);
    showMessage('Не удалось загрузить XML-данные. Проверьте, что сайт открыт через локальный сервер (Live Server).');
  }
  initAppUi();
});
