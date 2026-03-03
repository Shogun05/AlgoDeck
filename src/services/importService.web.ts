/**
 * Web version of importService.ts
 * Uses a hidden <input type="file"> to pick a .algodeck file, then reads it
 * and writes into localStorage — same logic as the native version.
 */
import { Alert, Platform } from 'react-native';
import JSZip from 'jszip';
import { WEB_KEYS, loadTable, saveTable, nextId, saveWebImage } from '../db/webStorage';
import { Question, Solution, RevisionLog, Notebook } from '../types';
import { getNow } from '../utils/helpers';

const pickFile = (): Promise<ArrayBuffer | string> =>
    new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.algodeck,.json';
        input.style.display = 'none';
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return reject(new Error('No file selected'));
            const reader = new FileReader();
            reader.onload = e => resolve(e.target?.result as ArrayBuffer | string);
            reader.onerror = () => reject(new Error('Failed to read file'));
            // Read as ArrayBuffer to support binary ZIP payloads safely
            reader.readAsArrayBuffer(file);
        };
        input.oncancel = () => reject(new Error('cancelled'));
        document.body.appendChild(input);
        input.click();
        setTimeout(() => document.body.removeChild(input), 5000);
    });

export const importBackup = async (): Promise<{ success: boolean; message: string }> => {
    let rawContent: ArrayBuffer | string;
    try {
        rawContent = await pickFile();
    } catch (e: any) {
        if (e.message === 'cancelled' || e.message === 'No file selected') {
            return { success: false, message: 'Import cancelled' };
        }
        return { success: false, message: `File pick failed: ${e.message}` };
    }

    try {
        let data: any;
        let isZip = false;
        let loadedZip: JSZip | null = null;

        // Peek at data to see if it's plaintext JSON
        let isLegacyJson = false;
        if (typeof rawContent === 'string') {
            isLegacyJson = rawContent.trim().startsWith('{');
        } else if (rawContent instanceof ArrayBuffer) {
            const peekView = new Uint8Array(rawContent, 0, Math.min(5, rawContent.byteLength));
            const peekString = String.fromCharCode.apply(null, Array.from(peekView));
            isLegacyJson = peekString.trim().startsWith('{');
        }

        if (isLegacyJson) {
            // v1/v2/v3 Plain JSON fallback
            let jsonStr = '';
            if (typeof rawContent === 'string') {
                jsonStr = rawContent;
            } else {
                const decoder = new TextDecoder('utf-8');
                jsonStr = decoder.decode(rawContent as ArrayBuffer);
            }
            data = JSON.parse(jsonStr);
        } else {
            // v4+ Binary ZIP archive
            isZip = true;
            loadedZip = await JSZip.loadAsync(rawContent);
            const jsonFile = loadedZip.file('data.json');
            if (!jsonFile) throw new Error('data.json not found inside archive');
            const jsonStr = await jsonFile.async('string');
            data = JSON.parse(jsonStr);
        }

        if (!data.questions || !Array.isArray(data.questions)) {
            return { success: false, message: 'Invalid backup: missing questions array' };
        }
        if (!data.solutions || !Array.isArray(data.solutions)) {
            return { success: false, message: 'Invalid backup: missing solutions array' };
        }
        if (!data.revision_logs || !Array.isArray(data.revision_logs)) {
            return { success: false, message: 'Invalid backup: missing revision_logs array' };
        }

        const isV2 = data.version === 2;
        const isV3 = data.version === 3;
        const isV4 = data.version >= 4;
        let imagesRestored = 0;
        let notebooksRestored = 0;

        // ── Notebooks ────────────────────────────────────────────────────────
        const notebookIdMap = new Map<number, number>();
        const existingNotebooks = loadTable<Notebook>(WEB_KEYS.notebooks);

        if (isV3 && data.notebooks && Array.isArray(data.notebooks)) {
            for (const nb of data.notebooks) {
                const existing = existingNotebooks.find((n: Notebook) => n.name === nb.name);
                if (existing) {
                    notebookIdMap.set(nb.id, existing.id);
                } else {
                    const id = nextId(existingNotebooks);
                    existingNotebooks.push({ id, name: nb.name, color: nb.color || '#a985ff', created_at: nb.created_at || getNow() });
                    notebookIdMap.set(nb.id, id);
                    notebooksRestored++;
                }
            }
            saveTable(WEB_KEYS.notebooks, existingNotebooks);
        }

        // ── Questions ────────────────────────────────────────────────────────
        const existingQuestions = loadTable<Question>(WEB_KEYS.questions);
        const existingSolutions = loadTable<Solution>(WEB_KEYS.solutions);
        const existingLogs = loadTable<RevisionLog>(WEB_KEYS.revision_logs);

        // Pre-compute existing titles map
        const existingTitles = new Map<string, number>();
        for (const q of existingQuestions) {
            existingTitles.set(q.title.toLowerCase().trim(), q.id);
        }

        let collisionCount = 0;
        for (const q of data.questions) {
            if (existingTitles.has(q.title.toLowerCase().trim())) {
                collisionCount++;
            }
        }

        let policy: 'keep' | 'skip' | 'overwrite' = 'keep';
        if (collisionCount > 0) {
            if (Platform.OS === 'web') {
                const ans = window.prompt(`Found ${collisionCount} duplicates.\nType 'skip' to ignore incoming,\n'overwrite' to replace existing,\nOr 'keep' to keep both (default):`, 'keep');
                if (ans === 'skip' || ans === 'overwrite') policy = ans;
            } else {
                policy = await new Promise<'keep' | 'skip' | 'overwrite'>((resolve) => {
                    Alert.alert(
                        'Import Collisions Found',
                        `Found ${collisionCount} questions with duplicate titles. How would you like to handle them?`,
                        [
                            { text: 'Keep Both', onPress: () => resolve('keep') },
                            { text: 'Skip Incoming', onPress: () => resolve('skip') },
                            { text: 'Overwrite Existing', style: 'destructive', onPress: () => resolve('overwrite') }
                        ],
                        { cancelable: false }
                    );
                });
            }
        }

        const questionIdMap = new Map<number, number>();

        for (const q of data.questions) {
            const normalizedTitle = q.title.toLowerCase().trim();
            if (existingTitles.has(normalizedTitle)) {
                if (policy === 'skip') {
                    continue;
                } else if (policy === 'overwrite') {
                    const oldId = existingTitles.get(normalizedTitle);
                    if (oldId) {
                        const qIndex = existingQuestions.findIndex(x => x.id === oldId);
                        if (qIndex > -1) existingQuestions.splice(qIndex, 1);

                        let i = existingSolutions.length;
                        while (i--) {
                            if (existingSolutions[i].question_id === oldId) existingSolutions.splice(i, 1);
                        }

                        let j = existingLogs.length;
                        while (j--) {
                            if (existingLogs[j].question_id === oldId) existingLogs.splice(j, 1);
                        }

                        existingTitles.delete(normalizedTitle);
                    }
                }
            }

            // Restore image from base64 into web localStorage image store
            let screenshotPath = q.screenshot_path || '';
            const newId = nextId(existingQuestions);
            questionIdMap.set(q.id, newId);

            if ((isV2 || isV3) && !isZip && q._image_base64) {
                // Legacy inline base64
                const dataUri = `data:image/${q._image_ext || 'jpg'};base64,${q._image_base64}`;
                screenshotPath = await saveWebImage(newId, dataUri);
                imagesRestored++;
            } else if (isV4 && isZip && loadedZip && q._image_filename) {
                // Read from zipped virtual fs
                const imgFile = loadedZip.file('images/' + q._image_filename);
                if (imgFile) {
                    const base64Str = await imgFile.async('base64');
                    const ext = q._image_filename.split('.').pop() || 'jpg';
                    const dataUri = `data:image/${ext};base64,${base64Str}`;
                    screenshotPath = await saveWebImage(newId, dataUri);
                    imagesRestored++;
                }
            }

            let notebookId: number | null = null;
            if (q.notebook_id && notebookIdMap.has(q.notebook_id)) {
                notebookId = notebookIdMap.get(q.notebook_id)!;
            } else if (q.notebook_id && !isV3) {
                notebookId = q.notebook_id;
            }

            existingQuestions.push({
                id: newId,
                title: q.title,
                difficulty: q.difficulty,
                tags: Array.isArray(q.tags) ? q.tags : JSON.parse(q.tags || '[]'),
                screenshot_path: screenshotPath,
                ocr_text: q.ocr_text || '',
                notes: q.notes || '',
                priority: q.priority || 0,
                notebook_id: notebookId,
                created_at: q.created_at || getNow(),
                last_reviewed: q.last_reviewed ?? null,
                next_review_date: q.next_review_date ?? null,
                interval: q.interval || 0,
                ease_factor: q.ease_factor || 2.5,
                repetition: q.repetition || 0,
            });
        }
        saveTable(WEB_KEYS.questions, existingQuestions);

        // ── Solutions ────────────────────────────────────────────────────────
        for (const s of data.solutions) {
            existingSolutions.push({
                id: nextId(existingSolutions),
                question_id: questionIdMap.get(s.question_id) ?? s.question_id,
                tier: s.tier,
                language: s.language || 'python',
                code: s.code,
                explanation: s.explanation || '',
                time_complexity: s.time_complexity || '',
                space_complexity: s.space_complexity || '',
                created_at: s.created_at || getNow(),
            });
        }
        saveTable(WEB_KEYS.solutions, existingSolutions);

        // ── Revision logs ────────────────────────────────────────────────────
        for (const r of data.revision_logs) {
            existingLogs.push({
                id: nextId(existingLogs),
                question_id: questionIdMap.get(r.question_id) ?? r.question_id,
                rating: r.rating,
                timestamp: r.timestamp || getNow(),
            });
        }
        saveTable(WEB_KEYS.revision_logs, existingLogs);

        const imgMsg = imagesRestored > 0 ? ` (${imagesRestored} images restored)` : '';
        const nbMsg = notebooksRestored > 0 ? `, ${notebooksRestored} notebooks` : '';
        return {
            success: true,
            message: `Imported ${data.questions.length} questions, ${data.solutions.length} solutions, ${data.revision_logs.length} revision logs${nbMsg}${imgMsg}`,
        };
    } catch (error: any) {
        return { success: false, message: `Import failed: ${error.message}` };
    }
};
