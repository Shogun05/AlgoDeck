/**
 * Web version of exportService.ts
 * Builds the same v3 .algodeck JSON and triggers a browser download.
 * No expo-file-system or expo-sharing needed.
 */
import { questionService } from '../db/questionService';
import { solutionService } from '../db/solutionService';
import { revisionService } from '../db/revisionService';
import { notebookService } from '../db/notebookService';
import { generateFilename } from '../utils/helpers';
import { loadWebImage, extractBase64, extractExt } from '../db/webStorage';

/** Trigger a browser file download */
const browserDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 200);
};

/** Export all (or a single notebook) as a v3 .algodeck file — same format as mobile. */
export const exportZip = async (notebookId?: number): Promise<string> => {
    let questions = await questionService.getAll(notebookId);
    const allSolutions = await solutionService.getAll();
    const revisionLogs = await revisionService.getAll();
    const allNotebooks = await notebookService.getAll();

    const qIds = new Set(questions.map(q => q.id));
    const solutions = notebookId ? allSolutions.filter(s => qIds.has(s.question_id)) : allSolutions;
    const filteredLogs = notebookId ? revisionLogs.filter(l => qIds.has(l.question_id)) : revisionLogs;

    // Bundle images as base64 (web images are stored as data URIs in localStorage)
    const bundledQuestions = await Promise.all(questions.map(async q => {
        let imageBase64 = '';
        let imageExt = 'jpg';
        if (q.screenshot_path && q.screenshot_path.startsWith('web://img/')) {
            const dataUri = await loadWebImage(q.screenshot_path);
            if (dataUri) {
                imageBase64 = extractBase64(dataUri);
                imageExt = extractExt(dataUri);
            }
        }
        return { ...q, _image_base64: imageBase64, _image_ext: imageExt };
    }));

    const exportedNbIds = new Set(
        bundledQuestions.map(q => q.notebook_id).filter((id): id is number => id != null)
    );
    const notebooksToExport = notebookId
        ? allNotebooks.filter(nb => nb.id === notebookId)
        : allNotebooks.filter(nb => exportedNbIds.has(nb.id));

    const backup = {
        version: 3,
        exported_at: new Date().toISOString(),
        notebooks: notebooksToExport,
        questions: bundledQuestions,
        solutions,
        revision_logs: filteredLogs,
    };

    const filename = generateFilename('algodeck_backup', 'algodeck');
    const content = JSON.stringify(backup);
    browserDownload(content, filename);
    return filename;
};

/** On web, "sharing" just means downloading. */
export const shareFile = async (filename: string): Promise<void> => {
    // Already downloaded by exportZip — no-op here
};

/** Legacy JSON export */
export const exportJSON = async (): Promise<string> => {
    const questions = await questionService.getAll();
    const solutions = await solutionService.getAll();
    const revision_logs = await revisionService.getAll();

    const backup = {
        version: 1,
        exported_at: new Date().toISOString(),
        questions,
        solutions,
        revision_logs,
    };
    const filename = generateFilename('algodeck_backup', 'json');
    browserDownload(JSON.stringify(backup, null, 2), filename);
    return filename;
};
