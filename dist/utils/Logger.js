"use strict";
// PATH: backend/src/utils/Logger.ts
/**
 * Logger minimaliste (console) mais maintenant compatible
 * avec les appels type `log.info(...args: unknown[])`.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = void 0;
class Logger {
    constructor(context = 'App') {
        this.context = context;
    }
    /* --- Méthodes – acceptent un nombre variable d’arguments --- */
    info(...args) {
        console.log(`[${new Date().toISOString()}] INFO  [${this.context}]`, ...args);
    }
    warn(...args) {
        console.warn(`[${new Date().toISOString()}] WARN  [${this.context}]`, ...args);
    }
    error(...args) {
        console.error(`[${new Date().toISOString()}] ERROR [${this.context}]`, ...args);
    }
    debug(...args) {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[${new Date().toISOString()}] DEBUG [${this.context}]`, ...args);
        }
    }
}
exports.Logger = Logger;
/* Singleton pratique — optionnel */
exports.logger = new Logger('Ecolojia');
// EOF
