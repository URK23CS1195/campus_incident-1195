# CareerFlow — Job & Internship Application Tracker

Frontend-only implementation using HTML, CSS and vanilla JavaScript.

## Structure

- `index.html` — application shell and CDN dependencies
- `css/styles.css` — complete responsive design system
- `js/data.js` — mock applications, events, constants and localStorage helpers
- `js/app.js` — SPA routing, rendering, forms, Kanban drag/drop, drawer, charts, calendar, settings and auth demo

## Run

No build step is required.

1. Extract the folder.
2. Open `index.html` in a modern browser.
3. The app uses `localStorage`, so changes survive page refreshes.

For the charts, Chart.js is loaded from jsDelivr. An internet connection is needed for charts; the rest of the UI is local.

## Demo authentication

The login/register screens are frontend-only. Any valid-looking form submission enters the app. There is no real authentication or backend.

## Later backend integration

The `loadApplications`, `saveApplications`, `loadEvents`, and `saveEvents` functions in `js/data.js` are intentionally isolated so they can later be replaced with calls to a Node.js / Express API backed by SQLite.

## Main interactions included

- Responsive sidebar
- Dashboard statistics
- Application status charts
- Monthly application chart
- Success funnel
- Follow-up alerts
- Kanban board with drag/drop status changes
- Search, status/company filters and sorting
- Add/edit application form
- Application details drawer
- Delete confirmation
- Calendar month/agenda views
- Analytics dashboard
- Settings/preferences
- Login/register/logout demo
- Toast notifications
- localStorage persistence
