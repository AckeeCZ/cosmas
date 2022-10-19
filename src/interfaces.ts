import { Request, Response } from 'express';
import { pino } from 'pino';

interface LoggerOptions extends pino.LoggerOptions {
    streams?: Array<{ stream: NodeJS.WritableStream; level?: pino.Level }>;
}

// this is basically enhanced version of pino-multi-stream.Streams type
export interface CosmasStream {
    level?: pino.Level;
    maxLevel?: number; // this is not processed by pino, so we need the number directly
    stream: NodeJS.WritableStream;
}

export interface CosmasOptions {
    disableFields?: string[];
    enableFields?: string[];
    defaultLevel?: pino.Level;
    disableStackdriverFormat?: boolean;
    streams?: CosmasStream[];
    formatters?: pino.LoggerOptions['formatters'];
    ignoredHttpMethods?: string[];
    config?: LoggerOptions;
    pretty?: boolean;
    loggerName?: string;
    skip?: (req: Request, res?: Response) => boolean;
}
