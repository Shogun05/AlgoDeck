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
        // Load Tesseract via script tag to completely bypass Metro bundler's static analysis
        // This avoids the 'import.meta' SyntaxError that crashes Expo Web builds
        if (typeof window !== 'undefined' && !(window as any).Tesseract) {
            await new Promise<void>((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js';
                script.async = true;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Failed to load Tesseract.js script'));
                document.head.appendChild(script);
            });
        }

        const Tesseract = (window as any).Tesseract;
        if (!Tesseract) {
            throw new Error('Tesseract failed to initialize on window');
        }

        if (!tesseractWorker) {
            // Explicitly pass CDN paths to avoid Tesseract trying to resolve local Node paths
            tesseractWorker = await Tesseract.createWorker('eng', 1, {
                workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/worker.min.js',
                langPath: 'https://tessdata.projectnaptha.com/4.0.0',
                corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm.js',
            });
        }

        // Draw the image to a canvas and pass pixel data. Tesseract is 100% reliable with canvases
        // as it avoids C++ leptonica passing errors from compressed Blobs or strange React Native Web URIs.
        const img = new window.Image();
        img.crossOrigin = 'Anonymous';
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error('Failed to load image for OCR'));
            img.src = imageUri;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0);

        const { data: { text } } = await tesseractWorker.recognize(canvas);
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
