import { Request, Response } from 'express';
import * as pino from 'pino';

interface LoggerOptions extends pino.LoggerOptions {
    streams?: Array<{ stream: NodeJS.WritableStream; level?: pino.Level }>;
}

// this is basically enhanced version of pino-multi-stream.Streams type
export interface CosmasStream {
    level?: pino.LevelWithSilent;
    maxLevel?: number; // this is not processed by pino, so we need the number directly
    stream: NodeJS.WritableStream;
}

export interface CosmasOptions {
    disableFields?: string[];
    enableFields?: string[];
    defaultLevel?: pino.LevelWithSilent;
    disableStackdriverFormat?: boolean;
    streams?: CosmasStream[];
    ignoredHttpMethods?: string[];
    config?: LoggerOptions;
    pretty?: boolean;
    sentry?: string | boolean;
    sentryLevel?: pino.LevelWithSilent;
    skip?: (req: Request, res?: Response) => boolean;
}
