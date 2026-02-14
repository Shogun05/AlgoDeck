import * as SQLite from 'expo-sqlite';
import { ALL_MIGRATIONS } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
    if (db) return db;
    db = await SQLite.openDatabaseAsync('algodeck.db');
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
    await runMigrations(db);
    return db;
};

const runMigrations = async (database: SQLite.SQLiteDatabase): Promise<void> => {
    for (const migration of ALL_MIGRATIONS) {
        await database.execAsync(migration);
    }
};

export const closeDatabase = async (): Promise<void> => {
    if (db) {
        await db.closeAsync();
        db = null;
    }
};
