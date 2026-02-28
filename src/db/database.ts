import * as SQLite from 'expo-sqlite';
import { ALL_MIGRATIONS, FTS_MIGRATIONS, REBUILD_FTS, ADD_LANGUAGE_COLUMN, ADD_NOTEBOOK_ID_COLUMN } from './schema';

let db: SQLite.SQLiteDatabase | null = null;
let ftsAvailable = false;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
    if (db) return db;
    db = await SQLite.openDatabaseAsync('algodeck.db');
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
    await runMigrations(db);
    await runColumnMigrations(db);
    await runFTSMigrations(db);
    return db;
};

const runMigrations = async (database: SQLite.SQLiteDatabase): Promise<void> => {
    for (const migration of ALL_MIGRATIONS) {
        await database.execAsync(migration);
    }
};

/**
 * Run ALTER TABLE migrations for adding new columns.
 * Each is wrapped in try-catch because ALTER TABLE fails if column already exists.
 */
const runColumnMigrations = async (database: SQLite.SQLiteDatabase): Promise<void> => {
    try {
        await database.execAsync(ADD_LANGUAGE_COLUMN);
    } catch {
        // Column already exists — safe to ignore
    }
    try {
        await database.execAsync(ADD_NOTEBOOK_ID_COLUMN);
    } catch {
        // Column already exists — safe to ignore
    }
};

/**
 * Set up FTS5 inverted index tables & triggers.
 * Wrapped in try-catch because FTS5 may not be available on every
 * SQLite build (though it is on modern Android/iOS).
 */
const runFTSMigrations = async (database: SQLite.SQLiteDatabase): Promise<void> => {
    try {
        for (const migration of FTS_MIGRATIONS) {
            await database.execAsync(migration);
        }
        ftsAvailable = true;
    } catch (error) {
        console.warn('FTS5 not available — falling back to LIKE search:', error);
        ftsAvailable = false;
    }
};

/** Whether the FTS5 inverted index is available */
export const isFTSAvailable = (): boolean => ftsAvailable;

/** Rebuild the FTS5 inverted index (call after bulk import) */
export const rebuildFTS = async (): Promise<void> => {
    if (!db || !ftsAvailable) return;
    try {
        await db.execAsync(REBUILD_FTS);
    } catch (error) {
        console.warn('FTS rebuild failed:', error);
    }
};

export const closeDatabase = async (): Promise<void> => {
    if (db) {
        await db.closeAsync();
        db = null;
        ftsAvailable = false;
    }
};
