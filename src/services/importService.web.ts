/**
 * Web version of importService.ts
 * Uses a hidden <input type="file"> to pick a .algodeck file, then reads it
 * and writes into localStorage — same logic as the native version.
 */
import { WEB_KEYS, loadTable, saveTable, nextId, saveWebImage, clearWebImages } from '../db/webStorage';
import { Question, Solution, RevisionLog, Notebook } from '../types';
import { getNow } from '../utils/helpers';
import JSZip from 'jszip';

const pickFile = (): Promise<File> =>
    new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.algodeck,.json';
        input.style.display = 'none';
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return reject(new Error('No file selected'));
            resolve(file);
        };
        input.oncancel = () => reject(new Error('cancelled'));
        document.body.appendChild(input);
        input.click();
        setTimeout(() => {
            if (document.body.contains(input)) {
                document.body.removeChild(input);
            }
        }, 5000);
    });

export const importBackup = async (): Promise<{ success: boolean; message: string }> => {
    let file: File;
    try {
        file = await pickFile();
    } catch (e: any) {
        if (e.message === 'cancelled' || e.message === 'No file selected') {
            return { success: false, message: 'Import cancelled' };
        }
        return { success: false, message: `File pick failed: ${e.message}` };
    }

    try {
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target?.result as ArrayBuffer);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });

        const uint8 = new Uint8Array(arrayBuffer);
        const isZip = uint8[0] === 0x50 && uint8[1] === 0x4b && uint8[2] === 0x03 && uint8[3] === 0x04;

        let data: any;
        let zip: JSZip | null = null;

        if (isZip) {
            zip = await JSZip.loadAsync(arrayBuffer);
            const dataJsonFile = zip.file('data.json');
            if (!dataJsonFile) {
                return { success: false, message: 'Invalid backup: missing data.json inside zip' };
            }
            const dataJsonText = await dataJsonFile.async('string');
            data = JSON.parse(dataJsonText);
        } else {
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(uint8);
            data = JSON.parse(text);
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

        const isV3 = (data.version ?? 1) >= 3;
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
        // Clear existing data
        saveTable(WEB_KEYS.questions, []);
        saveTable(WEB_KEYS.solutions, []);
        saveTable(WEB_KEYS.revision_logs, []);
        await clearWebImages();

        const questions: Question[] = [];
        for (const q of data.questions) {
            // Restore image from base64 or from within ZIP archive
            let screenshotPath = q.screenshot_path || '';
            if (isZip && zip && q._image_filename) {
                const imgPathInZip = `images/${q._image_filename}`;
                const imgFile = zip.file(imgPathInZip);
                if (imgFile) {
                    const ext = q._image_filename.split('.').pop() || 'jpg';
                    const base64Data = await imgFile.async('base64');
                    const dataUri = `data:image/${ext};base64,${base64Data}`;
                    screenshotPath = await saveWebImage(q.id, dataUri);
                    imagesRestored++;
                }
            } else if (q._image_base64) {
                const ext = q._image_ext || 'jpg';
                const dataUri = `data:image/${ext};base64,${q._image_base64}`;
                screenshotPath = await saveWebImage(q.id, dataUri);
                imagesRestored++;
            }

            let notebookId: number | null = null;
            if (q.notebook_id && notebookIdMap.has(q.notebook_id)) {
                notebookId = notebookIdMap.get(q.notebook_id)!;
            } else if (q.notebook_id && !isV3) {
                notebookId = q.notebook_id;
            }

            questions.push({
                id: q.id,
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
        saveTable(WEB_KEYS.questions, questions);

        // ── Solutions ────────────────────────────────────────────────────────
        const solutions: Solution[] = data.solutions.map((s: any) => ({
            id: s.id,
            question_id: s.question_id,
            tier: s.tier,
            language: s.language || 'python',
            code: s.code,
            explanation: s.explanation || '',
            time_complexity: s.time_complexity || '',
            space_complexity: s.space_complexity || '',
            created_at: s.created_at || getNow(),
        }));
        saveTable(WEB_KEYS.solutions, solutions);

        // ── Revision logs ────────────────────────────────────────────────────
        const logs: RevisionLog[] = data.revision_logs.map((r: any) => ({
            id: r.id,
            question_id: r.question_id,
            rating: r.rating,
            timestamp: r.timestamp || getNow(),
        }));
        saveTable(WEB_KEYS.revision_logs, logs);

        const imgMsg = imagesRestored > 0 ? ` (${imagesRestored} images restored)` : '';
        const nbMsg = notebooksRestored > 0 ? `, ${notebooksRestored} notebooks` : '';
        return {
            success: true,
            message: `Imported ${questions.length} questions, ${solutions.length} solutions, ${logs.length} revision logs${nbMsg}${imgMsg}`,
        };
    } catch (error: any) {
        return { success: false, message: `Import failed: ${error.message}` };
    }
};

export const importJSON = importBackup;
