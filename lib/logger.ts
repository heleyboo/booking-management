import fs from 'fs';
import path from 'path';

const LOG_FILE_PATH = path.join(process.cwd(), 'auth.log');

export const logger = {
    info: (message: string, meta?: any) => {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [INFO]: ${message} ${meta ? JSON.stringify(meta) : ''}\n`;

        // Log to console
        console.log(logMessage.trim());

        try {
            fs.appendFileSync(LOG_FILE_PATH, logMessage);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    },
    error: (message: string, error?: any) => {
        const timestamp = new Date().toISOString();
        const errorMessage = error instanceof Error ? error.stack : JSON.stringify(error);
        const logMessage = `[${timestamp}] [ERROR]: ${message} ${errorMessage || ''}\n`;

        // Log to console
        console.error(logMessage.trim());

        try {
            fs.appendFileSync(LOG_FILE_PATH, logMessage);
        } catch (err) {
            console.error('Failed to write to log file:', err);
        }
    }
};
