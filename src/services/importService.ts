import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { getDatabase } from '../db/database';
import { BackupData } from '../types';
import { getNow } from '../utils/helpers';

export const importJSON = async (): Promise<{ success: boolean; message: string }> => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: 'application/json',
            copyToCacheDirectory: true,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
            return { success: false, message: 'Import cancelled' };
        }

        const fileUri = result.assets[0].uri;
        const content = await FileSystem.readAsStringAsync(fileUri);
        const data: BackupData = JSON.parse(content);

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

        const db = await getDatabase();

        // Clear existing data
        await db.execAsync('DELETE FROM revision_logs');
        await db.execAsync('DELETE FROM solutions');
        await db.execAsync('DELETE FROM questions');

        // Insert questions
        for (const q of data.questions) {
            await db.runAsync(
                `INSERT INTO questions (id, title, difficulty, tags, screenshot_path, ocr_text, notes, priority, created_at, last_reviewed, next_review_date, interval, ease_factor, repetition)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    q.id, q.title, q.difficulty,
                    Array.isArray(q.tags) ? JSON.stringify(q.tags) : q.tags,
                    q.screenshot_path, q.ocr_text, q.notes,
                    q.priority || 0,
                    q.created_at || getNow(),
                    q.last_reviewed, q.next_review_date,
                    q.interval || 0, q.ease_factor || 2.5, q.repetition || 0,
                ]
            );
        }

        // Insert solutions
        for (const s of data.solutions) {
            await db.runAsync(
                `INSERT INTO solutions (id, question_id, tier, code, explanation, time_complexity, space_complexity, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [s.id, s.question_id, s.tier, s.code, s.explanation, s.time_complexity, s.space_complexity, s.created_at || getNow()]
            );
        }

        // Insert revision logs
        for (const r of data.revision_logs) {
            await db.runAsync(
                `INSERT INTO revision_logs (id, question_id, rating, timestamp)
         VALUES (?, ?, ?, ?)`,
                [r.id, r.question_id, r.rating, r.timestamp || getNow()]
            );
        }

        return {
            success: true,
            message: `Imported ${data.questions.length} questions, ${data.solutions.length} solutions, ${data.revision_logs.length} revision logs`,
        };
    } catch (error: any) {
        return { success: false, message: `Import failed: ${error.message}` };
    }
};
