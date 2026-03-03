/**
 * Web stub for database.ts — no-op since web uses localStorage via webStorage.ts.
 * Metro/Webpack will pick this file over database.ts when building for web.
 */

export const getDatabase = async () => { throw new Error('[web] SQLite not used on web'); };
export const isFTSAvailable = () => false;
export const rebuildFTS = async () => {};
export const closeDatabase = async () => {};
