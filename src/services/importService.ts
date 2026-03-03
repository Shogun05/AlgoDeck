import { Alert, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { getDatabase, rebuildFTS } from '../db/database';
import { BackupData } from '../types';
import { getNow } from '../utils/helpers';

const IMAGES_DIR = `${FileSystem.documentDirectory}screenshots/`;

const ensureDir = async (dir: string) => {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
};

export const importBackup = async (): Promise<{ success: boolean; message: string }> => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: '*/*',
            copyToCacheDirectory: true,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
            return { success: false, message: 'Import cancelled' };
        }

        const fileUri = result.assets[0].uri;
        const content = await FileSystem.readAsStringAsync(fileUri);
        const data = JSON.parse(content) as any;

        // Validate
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
        const isV3 = data.version >= 3;
        let imagesRestored = 0;
        let notebooksRestored = 0;

        // If v2+, restore images from base64 to disk
        if (isV2 || isV3) {
            await ensureDir(IMAGES_DIR);
            for (const q of data.questions) {
                if (q._image_base64) {
                    const ext = q._image_ext || 'jpg';
                    const imgFilename = `restored_${q.id}_${Date.now()}.${ext}`;
                    const imgPath = IMAGES_DIR + imgFilename;
                    await FileSystem.writeAsStringAsync(imgPath, q._image_base64, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                    // Update the screenshot_path to point to the restored file
                    q.screenshot_path = imgPath;
                    imagesRestored++;
                }
            }
        }

        const db = await getDatabase();

        // Check for collisions
        const existingRows = await db.getAllAsync<{ id: number; title: string }>('SELECT id, title FROM questions');
        const existingTitles = new Map<string, number>();
        for (const r of existingRows) {
            existingTitles.set(r.title.toLowerCase().trim(), r.id);
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

        // Restore notebooks if v3
        const notebookIdMap = new Map<number, number>(); // old ID → new ID
        if (isV3 && data.notebooks && Array.isArray(data.notebooks)) {
            // Don't clear existing notebooks — merge them
            for (const nb of data.notebooks) {
                // Check if notebook with same name already exists
                const existing = await db.getFirstAsync<{ id: number }>(
                    'SELECT id FROM notebooks WHERE name = ?', [nb.name]
                );
                if (existing) {
                    notebookIdMap.set(nb.id, existing.id);
                } else {
                    const res = await db.runAsync(
                        'INSERT INTO notebooks (name, color, created_at) VALUES (?, ?, ?)',
                        [nb.name, nb.color || '#a985ff', nb.created_at || getNow()]
                    );
                    notebookIdMap.set(nb.id, res.lastInsertRowId);
                    notebooksRestored++;
                }
            }
        }

        const questionIdMap = new Map<number, number>(); // old q.id -> new q.id

        // Insert questions
        for (const q of data.questions) {
            const normalizedTitle = q.title.toLowerCase().trim();
            if (existingTitles.has(normalizedTitle)) {
                if (policy === 'skip') {
                    // Skip inserting this question entirely
                    continue;
                } else if (policy === 'overwrite') {
                    // Delete the existing question. PRAGMA foreign_keys = ON handles cascading logs and solutions!
                    const oldId = existingTitles.get(normalizedTitle);
                    if (oldId) {
                        await db.runAsync('DELETE FROM questions WHERE id = ?', [oldId]);
                        // Remove from map to prevent double-deleting on edge case duplicates in incoming payload
                        existingTitles.delete(normalizedTitle);
                    }
                }
            }

            // Remap notebook_id if available
            let notebookId = null;
            if (q.notebook_id && notebookIdMap.has(q.notebook_id)) {
                notebookId = notebookIdMap.get(q.notebook_id);
            } else if (q.notebook_id && !isV3) {
                notebookId = q.notebook_id; // Preserve raw ID for v2
            }
            const res = await db.runAsync(
                `INSERT INTO questions (title, difficulty, tags, screenshot_path, ocr_text, notes, priority, notebook_id, created_at, last_reviewed, next_review_date, interval, ease_factor, repetition)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    q.title, q.difficulty,
                    Array.isArray(q.tags) ? JSON.stringify(q.tags) : q.tags,
                    q.screenshot_path, q.ocr_text, q.notes,
                    q.priority || 0,
                    notebookId,
                    q.created_at || getNow(),
                    q.last_reviewed, q.next_review_date,
                    q.interval || 0, q.ease_factor || 2.5, q.repetition || 0,
                ]
            );
            questionIdMap.set(q.id, res.lastInsertRowId);
        }

        // Insert solutions
        for (const s of data.solutions) {
            const newQId = questionIdMap.get(s.question_id);
            if (!newQId) continue;
            await db.runAsync(
                `INSERT INTO solutions (question_id, tier, language, code, explanation, time_complexity, space_complexity, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [newQId, s.tier, (s as any).language || 'python', s.code, s.explanation, s.time_complexity, s.space_complexity, s.created_at || getNow()]
            );
        }

        // Insert revision logs
        for (const r of data.revision_logs) {
            const newQId = questionIdMap.get(r.question_id);
            if (!newQId) continue;
            await db.runAsync(
                `INSERT INTO revision_logs (question_id, rating, timestamp)
                 VALUES (?, ?, ?)`,
                [newQId, r.rating, r.timestamp || getNow()]
            );
        }

        // Rebuild the FTS5 inverted index so imported OCR text is searchable
        await rebuildFTS();

        const imgMsg = (isV2 || isV3) ? ` (${imagesRestored} images restored)` : '';
        const nbMsg = notebooksRestored > 0 ? `, ${notebooksRestored} notebooks` : '';
        return {
            success: true,
            message: `Imported ${data.questions.length} questions, ${data.solutions.length} solutions, ${data.revision_logs.length} revision logs${nbMsg}${imgMsg}`,
        };
    } catch (error: any) {
        return { success: false, message: `Import failed: ${error.message}` };
    }
};

// Keep legacy alias
export const importJSON = importBackup;
