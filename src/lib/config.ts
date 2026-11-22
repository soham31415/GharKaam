/** App-wide constants. No secrets here: this file can be imported anywhere. */

export const APP_NAME = "Gharkaam";
/** Brand "marigold bright": app icon background. */
export const APP_ICON_BACKGROUND = "#E8650F";
/** Browser/status bar colour: the page ground colour, light and dark. */
export const THEME_COLOR = "#F2F2F7";
export const THEME_COLOR_DARK = "#000000";

/** Every schedule, due date and reminder uses this timezone. IST has no daylight saving. */
export const TIMEZONE = "Asia/Kolkata";

/** Shopping list also shows items whose restock is due within this many days. */
export const SHOPPING_LOOKAHEAD_DAYS = 2;

export const DEVICE_COOKIE = "gk_device";
export const PROFILE_COOKIE = "gk_profile";

/** Browsers cap cookie lifetime at 400 days. */
export const COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/** Paths that work without the family passcode. */
export const PUBLIC_PATH_PREFIXES = [
  "/unlock",
  "/api/cron",
  "/manifest.webmanifest",
  "/sw.js",
  "/icons",
  "/~offline",
  "/_next",
  "/favicon.ico",
];

/** Public Realtime channel the database pings after every change (see drizzle/0002_realtime_triggers.sql). */
export const REALTIME_CHANNEL = "gharkaam-sync";
