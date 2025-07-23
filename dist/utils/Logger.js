"use strict";
// backend/src/utils/Logger.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = void 0;
class Logger {
    constructor(context = 'App') {
        this.context = context;
    }
    info(message, meta) {
        console.log(`[${new Date().toISOString()}] INFO [${this.context}]: ${message}`, meta || '');
    }
    error(message, meta) {
        console.error(`[${new Date().toISOString()}] ERROR [${this.context}]: ${message}`, meta || '');
    }
    warn(message, meta) {
        console.warn(`[${new Date().toISOString()}] WARN [${this.context}]: ${message}`, meta || '');
    }
    debug(message, meta) {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[${new Date().toISOString()}] DEBUG [${this.context}]: ${message}`, meta || '');
        }
    }
}
exports.Logger = Logger;
// Export une instance par défaut si besoin
exports.logger = new Logger('Ecolojia');
