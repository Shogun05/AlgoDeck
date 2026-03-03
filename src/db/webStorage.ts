/**
 * Lightweight localStorage-based persistence layer for web.
 * Used by all *.web.ts service files instead of expo-sqlite.
 */

const PREFIX = 'algodeck_';
import { get, set, del } from 'idb-keyval';

export const WEB_KEYS = {
    questions: PREFIX + 'questions',
    solutions: PREFIX + 'solutions',
    revision_logs: PREFIX + 'revision_logs',
    notebooks: PREFIX + 'notebooks',
};

export function loadTable<T>(key: string): T[] {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function saveTable<T>(key: string, items: T[]): void {
    try {
        localStorage.setItem(key, JSON.stringify(items));
    } catch (e) {
        console.warn('[webStorage] saveTable failed – storage full?', e);
    }
}

export function nextId(items: { id: number }[]): number {
    return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
}

// ─── Image store (base64 data URIs kept separately from text data) ──────────
const IMG_PREFIX = PREFIX + 'img_';

export async function saveWebImage(questionId: number | string, base64: string): Promise<string> {
    const key = IMG_PREFIX + questionId;
    try {
        await set(key, base64);
    } catch {
        // indexeddb full — silently drop image storage
    }
    return 'web://img/' + questionId;
}

export async function loadWebImage(path: string): Promise<string> {
    if (!path || !path.startsWith('web://img/')) return '';
    const id = path.replace('web://img/', '');
    try {
        const val = await get(IMG_PREFIX + id);
        return val || '';
    } catch {
        return '';
    }
}

export async function deleteWebImage(path: string): Promise<void> {
    if (!path || !path.startsWith('web://img/')) return;
    const id = path.replace('web://img/', '');
    await del(IMG_PREFIX + id);
}

/** Extract raw base64 (without the data:...;base64, prefix) from a data URI or plain base64. */
export function extractBase64(dataUri: string): string {
    if (dataUri.includes(';base64,')) {
        return dataUri.split(';base64,')[1];
    }
    return dataUri;
}

/** Return the image extension from a data URI */
export function extractExt(dataUri: string): string {
    const match = dataUri.match(/^data:image\/(\w+);base64,/);
    return match ? match[1] : 'jpg';
}
