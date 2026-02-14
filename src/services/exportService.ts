import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { questionService } from '../db/questionService';
import { solutionService } from '../db/solutionService';
import { revisionService } from '../db/revisionService';
import { BackupData, Question, Solution } from '../types';
import { generateFilename, sanitizeFilename } from '../utils/helpers';

const EXPORT_DIR = `${FileSystem.documentDirectory}exports/`;

const ensureExportDir = async () => {
    const info = await FileSystem.getInfoAsync(EXPORT_DIR);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(EXPORT_DIR, { intermediates: true });
    }
};

// ─── JSON EXPORT ─────────────────────────────────────────────
export const exportJSON = async (): Promise<string> => {
    await ensureExportDir();

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

export const shareFile = async (filepath: string): Promise<void> => {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
        await Sharing.shareAsync(filepath, {
            mimeType: 'application/json',
            dialogTitle: 'Export AlgoDeck Backup',
        });
    }
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
                lines.push('```');
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
    await ensureExportDir();
    const mdDir = EXPORT_DIR + 'markdown/';
    const imgDir = mdDir + 'images/';

    const mdInfo = await FileSystem.getInfoAsync(mdDir);
    if (!mdInfo.exists) {
        await FileSystem.makeDirectoryAsync(mdDir, { intermediates: true });
    }
    const imgInfo = await FileSystem.getInfoAsync(imgDir);
    if (!imgInfo.exists) {
        await FileSystem.makeDirectoryAsync(imgDir, { intermediates: true });
    }

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
    // On mobile, sharing a directory isn't straightforward
    // Share the first markdown file as a starting point
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
