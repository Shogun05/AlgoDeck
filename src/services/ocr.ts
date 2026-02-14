import { Platform } from 'react-native';

let tesseractWorker: any = null;

export const performOCR = async (imageUri: string): Promise<string> => {
    try {
        if (Platform.OS === 'web') {
            return await performOCRWeb(imageUri);
        }
        // On native, tesseract.js works but is slower
        // For a production app, consider react-native-mlkit-ocr with dev builds
        return await performOCRWeb(imageUri);
    } catch (error) {
        console.warn('OCR failed:', error);
        return '';
    }
};

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
