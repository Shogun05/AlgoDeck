import { Platform } from 'react-native';

let tesseractWorker: any = null;

/**
 * Perform OCR on an image and return extracted text.
 * - Native (Android/iOS): uses react-native-mlkit-ocr (Google ML Kit)
 * - Web: uses tesseract.js
 */
export const performOCR = async (imageUri: string): Promise<string> => {
    try {
        if (Platform.OS === 'web') {
            return await performOCRWeb(imageUri);
        }
        return await performOCRNative(imageUri);
    } catch {
        // OCR not available — return empty
        return '';
    }
};

/**
 * Native OCR using react-native-mlkit-ocr (Google ML Kit Text Recognition).
 */
const performOCRNative = async (imageUri: string): Promise<string> => {
    try {
        const MlkitOcr = require('react-native-mlkit-ocr').default;
        const result = await MlkitOcr.detectFromUri(imageUri);

        if (!result || result.length === 0) {
            return '';
        }

        // Each result block has .text — concatenate all blocks
        const text = result.map((block: { text: string }) => block.text).join('\n');
        return text.trim();
    } catch {
        // ML Kit may not be available in Expo Go — silently return empty
        return '';
    }
};

/**
 * Web OCR using tesseract.js (browser only).
 */
const performOCRWeb = async (imageUri: string): Promise<string> => {
    try {
        const Tesseract = require('tesseract.js');

        if (!tesseractWorker) {
            tesseractWorker = await Tesseract.createWorker('eng');
        }

        const { data: { text } } = await tesseractWorker.recognize(imageUri);
        return text.trim();
    } catch (error) {
        console.warn('Tesseract OCR failed:', error);
        return '';
    }
};

export const terminateOCR = async (): Promise<void> => {
    if (tesseractWorker) {
        await tesseractWorker.terminate();
        tesseractWorker = null;
    }
};
