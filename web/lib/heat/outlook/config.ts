/* 7-day heat outlook: where the site is, how far ahead it looks and how far the forecast is trusted. */

export const SITE_LOCATION = { place: 'Karachi', lat: 24.86, lon: 67.01, timeZone: 'Asia/Karachi' } as const;
export const OUTLOOK_DAYS = 7;
/** Weather forecasts hold up for about three days; later days are marked as less certain. */
export const CONFIDENT_DAYS = 3;
/** The app's own route that serves the live site forecast. */
export const OUTLOOK_API = '/api/heat/outlook';
