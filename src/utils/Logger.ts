// PATH: backend/src/utils/Logger.ts
/**
 * Logger minimaliste (console) mais maintenant compatible
 * avec les appels type `log.info(...args: unknown[])`.
 */

export class Logger {
  private context: string;

  constructor(context = 'App') {
    this.context = context;
  }

  /* --- Méthodes – acceptent un nombre variable d’arguments --- */
  info(...args: unknown[]): void {
    console.log(`[${new Date().toISOString()}] INFO  [${this.context}]`, ...args);
  }

  warn(...args: unknown[]): void {
    console.warn(`[${new Date().toISOString()}] WARN  [${this.context}]`, ...args);
  }

  error(...args: unknown[]): void {
    console.error(`[${new Date().toISOString()}] ERROR [${this.context}]`, ...args);
  }

  debug(...args: unknown[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${new Date().toISOString()}] DEBUG [${this.context}]`, ...args);
    }
  }
}

/* Singleton pratique — optionnel */
export const logger = new Logger('Ecolojia');
// EOF
