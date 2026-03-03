import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { zip } from 'react-native-zip-archive';
import { questionService } from '../db/questionService';
import { solutionService } from '../db/solutionService';
import { revisionService } from '../db/revisionService';
import { notebookService } from '../db/notebookService';
import { BackupData, Question, Solution } from '../types';
import { generateFilename, sanitizeFilename } from '../utils/helpers';

const EXPORT_DIR = `${FileSystem.documentDirectory}exports/`;

const ensureDir = async (dir: string) => {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
};

// ─── NATIVE ZIP EXPORT (.algodeck true ZIP format) ──────────
export const exportZip = async (notebookId?: number): Promise<string> => {
    await ensureDir(EXPORT_DIR);

    // We create a temporary staging directory to assemble the package
    const STAGING_DIR = EXPORT_DIR + 'staging/';
    const STAGING_IMG_DIR = STAGING_DIR + 'images/';

    // Wipe any previous staging junk
    try { await FileSystem.deleteAsync(STAGING_DIR); } catch { /* ignore */ }
    await ensureDir(STAGING_DIR);
    await ensureDir(STAGING_IMG_DIR);

    let questions = await questionService.getAll(notebookId);
    const allSolutions = await solutionService.getAll();
    const revisionLogs = await revisionService.getAll();

    const qIds = new Set(questions.map(q => q.id));
    const solutions = notebookId
        ? allSolutions.filter(s => qIds.has(s.question_id))
        : allSolutions;
    const filteredLogs = notebookId
        ? revisionLogs.filter(l => qIds.has(l.question_id))
        : revisionLogs;

    // Build the updated questions list, but DO NOT embed raw base64. 
    // Simply physically copy the images into the staging /images/ directory.
    const bundledQuestions = [];
    for (const q of questions) {
        let imageFilename = '';
        if (q.screenshot_path) {
            try {
                const srcInfo = await FileSystem.getInfoAsync(q.screenshot_path);
                if (srcInfo.exists) {
                    const ext = q.screenshot_path.split('.').pop() || 'jpg';
                    imageFilename = `${q.id}_image.${ext}`;
                    await FileSystem.copyAsync({
                        from: q.screenshot_path,
                        to: STAGING_IMG_DIR + imageFilename,
                    });
                }
            } catch { /* skip missing */ }
        }
        bundledQuestions.push({
            ...q,
            _image_filename: imageFilename || undefined,
        });
    }

    const allNotebooks = await notebookService.getAll();
    const exportedNotebookIds = new Set(
        bundledQuestions.map(q => q.notebook_id).filter((id): id is number => id != null)
    );
    const notebooksToExport = notebookId
        ? allNotebooks.filter(nb => nb.id === notebookId)
        : allNotebooks.filter(nb => exportedNotebookIds.has(nb.id));

    const bundledBackup = {
        version: 4, // Bump version to 4 to signify ZIP structure instead of JSON payload structure
        exported_at: new Date().toISOString(),
        notebooks: notebooksToExport,
        questions: bundledQuestions,
        solutions,
        revision_logs: filteredLogs,
    };

    // Write metadata to the core data.json file inside the ZIP staging foldler
    const dataJsonPath = STAGING_DIR + 'data.json';
    await FileSystem.writeAsStringAsync(dataJsonPath, JSON.stringify(bundledBackup));

    // Finally, run native thread background zip compression on the entire folder!
    const filename = generateFilename('algodeck_backup', 'algodeck');
    const outpath = EXPORT_DIR + filename;

    // Ensure old zip with same name is deleted, else zip-archive appends instead of overwriting
    try { await FileSystem.deleteAsync(outpath); } catch { /* ignore */ }

    await zip(STAGING_DIR, outpath);

    // Clean up staging footprint
    try { await FileSystem.deleteAsync(STAGING_DIR); } catch { /* ignore */ }

    return outpath;
};

export const shareFile = async (filepath: string): Promise<void> => {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
        await Sharing.shareAsync(filepath, {
            mimeType: 'application/octet-stream',
            dialogTitle: 'Export AlgoDeck Backup',
        });
    }
};

// ─── LEGACY JSON EXPORT (no images) ─────────────────────────
export const exportJSON = async (): Promise<string> => {
    await ensureDir(EXPORT_DIR);

    const questions = await questionService.getAll();
    const solutions = await solutionService.getAll();
    const revisionLogs = await revisionService.getAll();

    const backup: BackupData = {
        version: 1,
        exported_at: new Date().toISOString(),
        questions,
        solutions,
        revision_logs: revisionLogs,
    };

    const filename = generateFilename('algodeck_backup', 'json');
    const filepath = EXPORT_DIR + filename;
    await FileSystem.writeAsStringAsync(filepath, JSON.stringify(backup, null, 2));

    return filepath;
};

// ─── MARKDOWN EXPORT ─────────────────────────────────────────
const questionToMarkdown = (question: Question, solutions: Solution[]): string => {
    const lines: string[] = [];

    lines.push(`# ${question.title}\n`);
    lines.push(`**Difficulty:** ${question.difficulty}  `);
    lines.push(`**Tags:** ${question.tags.join(', ')}  `);
    lines.push(`**Created:** ${question.created_at}  `);
    if (question.notes) {
        lines.push(`\n## Notes\n`);
        lines.push(question.notes);
    }
    lines.push(`\n## Problem\n`);
    if (question.screenshot_path) {
        lines.push(`![Problem Screenshot](images/${question.screenshot_path.split('/').pop()})\n`);
    }
    if (question.ocr_text) {
        lines.push('```');
        lines.push(question.ocr_text);
        lines.push('```\n');
    }

    const tiers = ['brute', 'optimized', 'best'] as const;
    const tierLabels = { brute: 'Brute Force', optimized: 'Optimized', best: 'Best' };

    for (const tier of tiers) {
        const tierSolutions = solutions.filter(s => s.tier === tier);
        if (tierSolutions.length === 0) continue;

        lines.push(`## ${tierLabels[tier]}\n`);
        tierSolutions.forEach((sol, i) => {
            if (tierSolutions.length > 1) lines.push(`### Solution ${i + 1}\n`);
            if (sol.code) {
                const lang = (sol as any).language || 'python';
                lines.push(`\`\`\`${lang}`);
                lines.push(sol.code);
                lines.push('```\n');
            }
            if (sol.explanation) {
                lines.push(`**Explanation:** ${sol.explanation}\n`);
            }
            if (sol.time_complexity) lines.push(`**Time:** ${sol.time_complexity}  `);
            if (sol.space_complexity) lines.push(`**Space:** ${sol.space_complexity}\n`);
        });
    }

    return lines.join('\n');
};

export const exportMarkdown = async (questionId?: number): Promise<string> => {
    await ensureDir(EXPORT_DIR);
    const mdDir = EXPORT_DIR + 'markdown/';
    const imgDir = mdDir + 'images/';

    await ensureDir(mdDir);
    await ensureDir(imgDir);

    let questions: Question[];
    if (questionId) {
        const q = await questionService.getById(questionId);
        questions = q ? [q] : [];
    } else {
        questions = await questionService.getAll();
    }

    for (const question of questions) {
        const solutions = await solutionService.getByQuestionId(question.id);
        const md = questionToMarkdown(question, solutions);
        const filename = sanitizeFilename(question.title) + '.md';
        await FileSystem.writeAsStringAsync(mdDir + filename, md);

        // Copy image if exists
        if (question.screenshot_path) {
            const imgName = question.screenshot_path.split('/').pop();
            if (imgName) {
                const srcInfo = await FileSystem.getInfoAsync(question.screenshot_path);
                if (srcInfo.exists) {
                    await FileSystem.copyAsync({
                        from: question.screenshot_path,
                        to: imgDir + imgName,
                    });
                }
            }
        }
    }

    return mdDir;
};

export const shareMarkdownExport = async (questionId?: number): Promise<void> => {
    const dirPath = await exportMarkdown(questionId);
    const files = await FileSystem.readDirectoryAsync(dirPath);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    if (mdFiles.length > 0) {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
            await Sharing.shareAsync(dirPath + mdFiles[0], {
                mimeType: 'text/markdown',
                dialogTitle: 'Export AlgoDeck Markdown',
            });
        }
    }
};
