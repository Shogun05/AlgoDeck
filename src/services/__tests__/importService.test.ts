import { importBackup } from '../importService';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { unzip } from 'react-native-zip-archive';
import { rebuildFTS } from '../../db/database';

const mockDb = {
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
};

jest.mock('../../db/database', () => ({
    getDatabase: jest.fn(() => mockDb),
    rebuildFTS: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-document-picker', () => ({
    getDocumentAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
    readAsStringAsync: jest.fn(),
    writeAsStringAsync: jest.fn(),
    getInfoAsync: jest.fn(),
    makeDirectoryAsync: jest.fn(),
    copyAsync: jest.fn(),
    deleteAsync: jest.fn(),
    cacheDirectory: 'file:///mock-cache/',
    documentDirectory: 'file:///mock-docs/',
    EncodingType: {
        Base64: 'base64',
    },
}));

jest.mock('react-native-zip-archive', () => ({
    unzip: jest.fn(),
}));

describe('importBackup Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
    });

    it('should return cancelled when picker is cancelled', async () => {
        (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
            canceled: true,
        });

        const result = await importBackup();

        expect(result).toEqual({ success: false, message: 'Import cancelled' });
    });

    it('should fail if import file schema is invalid', async () => {
        (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
            canceled: false,
            assets: [{ uri: 'file:///mock.json', name: 'backup.json' }],
        });

        // Mock peek check and read to return an invalid JSON object (no questions array)
        (FileSystem.readAsStringAsync as jest.Mock)
            .mockResolvedValueOnce('{')
            .mockResolvedValueOnce(JSON.stringify({ version: 1 }));

        const result = await importBackup();

        expect(result.success).toBe(false);
        expect(result.message).toContain('missing questions array');
    });

    it('should parse legacy JSON structure directly if peek starts with {', async () => {
        (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
            canceled: false,
            assets: [{ uri: 'file:///mock.json', name: 'backup.json' }],
        });

        const validBackup = {
            version: 1,
            questions: [],
            solutions: [],
            revision_logs: [],
        };

        // Mock peek and read
        (FileSystem.readAsStringAsync as jest.Mock)
            .mockResolvedValueOnce(' { "v')  // starts with '{' after trimming
            .mockResolvedValueOnce(JSON.stringify(validBackup));

        const result = await importBackup();

        expect(result.success).toBe(true);
        // Verify that unzip was not triggered
        expect(unzip).not.toHaveBeenCalled();
        expect(rebuildFTS).toHaveBeenCalled();
    });

    it('should treat as ZIP if peek does not start with {, copying to local cache path before unzipping', async () => {
        (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
            canceled: false,
            assets: [{ uri: 'content:///picked-backup.algodeck', name: 'backup.algodeck' }],
        });

        const validBackup = {
            version: 4,
            questions: [],
            solutions: [],
            revision_logs: [],
        };

        // Mock peek checks & file read
        (FileSystem.readAsStringAsync as jest.Mock)
            .mockResolvedValueOnce('PK\x03\x04')  // Zip magic header
            .mockResolvedValueOnce(JSON.stringify(validBackup)); // file read inside unzip folder (data.json)

        const result = await importBackup();

        expect(result.success).toBe(true);
        // Verify local staging copy, unzip, and cleanup of zip cache
        expect(FileSystem.copyAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                from: 'content:///picked-backup.algodeck',
                to: expect.stringContaining('import_temp_'),
            })
        );
        expect(unzip).toHaveBeenCalledWith(
            expect.stringContaining('.zip'),
            expect.stringContaining('import_unzip_')
        );
        // Cleanup temp zip file
        expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
            expect.stringContaining('.zip'),
            { idempotent: true }
        );
        // Cleanup unzipped folder
        expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
            expect.stringContaining('import_unzip_')
        );
    });

    it('should clean up temp ZIP file even if unzip fails', async () => {
        (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
            canceled: false,
            assets: [{ uri: 'content:///picked-backup.algodeck', name: 'backup.algodeck' }],
        });

        // Mock peek checks
        (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce('PK\x03\x04');
        (unzip as jest.Mock).mockRejectedValueOnce(new Error('Unzip failed'));

        const result = await importBackup();

        expect(result.success).toBe(false);
        expect(result.message).toContain('Unzip failed');
        // Check that temp ZIP file was still cleaned up
        expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
            expect.stringContaining('.zip'),
            { idempotent: true }
        );
    });
});
