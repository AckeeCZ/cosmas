import * as pino from 'pino';

interface LoggerOptions extends pino.LoggerOptions {
    streams?: Array<{ stream: NodeJS.WritableStream; level?: pino.Level }>;
}

// this is basically enhanced version of pino-multi-stream.Streams type
export interface AckeeLoggerStream {
    level?: pino.LevelWithSilent;
    maxLevel?: number; // this is not processed by pino, so we need the number directly
    stream: NodeJS.WritableStream;
}

export interface AckeeLoggerOptions {
    disableFields?: string[];
    enableFields?: string[];
    defaultLevel?: pino.LevelWithSilent;
    disableStackdriverFormat?: boolean;
    streams?: AckeeLoggerStream[];
    ignoredHttpMethods?: string[];
    config?: LoggerOptions;
    pretty?: boolean;
}
