import { ErrorRequestHandler } from 'express';
import isObject = require('lodash.isobject');
import isString = require('lodash.isstring');
import * as pino from 'pino';
import { BaseLogger as PinoLogger } from 'pino';
import { Level, LoggerOptions, multistream } from 'pino-multi-stream';
import { AckeeLoggerExpressMiddleware, expressErrorMiddleware, expressMiddleware } from './express';
import * as serializers from './serializers';
import { StackDriverFormatStream } from './stackdriver';
import { AckeeLoggerStream, decorateStreams, DefaultTransformStream } from './streams';

export interface AckeeLoggerOptions {
    disableFields?: string[];
    enableFields?: string[];
    defaultLevel?: Level;
    disableStackdriverFormat?: boolean;
    streams?: AckeeLoggerStream[];
    ignoredHttpMethods?: string[];
    config?: LoggerOptions;
    pretty?: boolean;
}

export interface AckeeLogger extends PinoLogger {
    warning: pino.LogFn;
    options: AckeeLoggerOptions;
    express: AckeeLoggerExpressMiddleware;
    expressError: ErrorRequestHandler;
}

// This is a custom slightly edited version of pino-multistream's wirte method, whch adds support for maximum log level
// The original version was pino-multistream 3.1.2 (commit 71d98ae) - https://github.com/pinojs/pino-multi-stream/blob/71d98ae191e02c56e39e849d2c30d59c8c6db1b9/multistream.js#L43
const maxLevelWrite: pino.WriteFn = function(this: any, data: object): void {
    let stream;
    const needsMetadata = Symbol.for('needsMetadata');
    const level = this.lastLevel;
    const streams = this.streams;
    for (const dest of streams) {
        stream = dest.stream;
        if (dest.level <= level) {
            if (!dest.maxLevel || (dest.maxLevel && level < dest.maxLevel)) {
                if (stream[needsMetadata]) {
                    stream.lastLevel = level;
                    stream.lastMsg = this.lastMsg;
                    stream.lastObj = this.lastObj;
                    stream.lastLogger = this.lastLogger;
                }
                stream.write(data);
            }
        } else {
            break;
        }
    }
};

const defaultLogger = (options: AckeeLoggerOptions = {}): AckeeLogger => {
    const pretty = pino.pretty();
    pretty.pipe(process.stdout);
    const prettyErr = pino.pretty();
    prettyErr.pipe(process.stderr);

    serializers.disablePaths(options.disableFields);
    serializers.enablePaths(options.enableFields);

    const isTesting = process.env.NODE_ENV === 'test';
    let defaultLevel: Level = 'debug';

    if (isTesting) {
        defaultLevel = 'silent';
    }

    if (options.defaultLevel) {
        defaultLevel = options.defaultLevel;
    }

    let streams: AckeeLoggerStream[];
    let defaultMessageKey = 'message'; // best option for Google Stackdriver
    if (options.streams) {
        streams = options.streams;
    } else if (options.pretty) {
        streams = [{ level: defaultLevel, maxLevel: 'warn', stream: pretty }, { level: 'warn', stream: prettyErr }];
        defaultMessageKey = 'msg'; // default pino - best option for pretty print
    } else {
        streams = [
            { level: defaultLevel, maxLevel: 'warn', stream: process.stdout },
            { level: 'warn', stream: process.stderr },
        ];
    }
    if (!options.disableStackdriverFormat) {
        streams = decorateStreams(streams, StackDriverFormatStream);
    }

    streams = decorateStreams(streams, DefaultTransformStream);

    if (!options.ignoredHttpMethods) {
        options.ignoredHttpMethods = ['OPTIONS'];
    }

    const logger = pino(
        // no deep-merging needed, so assign is OK
        Object.assign(
            {},
            {
                base: {},
                level: defaultLevel,
                messageKey: defaultMessageKey,
                serializers: serializers.serializers,
                timestamp: false,
            },
            options.config
        ),
        multistream(streams)
    );
    logger.warning = logger.warn;
    (logger as any).options = options;

    // Add maxLevel support to pino-multi-stream
    // This could be replaced with custom pass-through stream being passed to multistream, which would filter the messages
    (logger as any).stream.write = maxLevelWrite.bind(logger.stream);
    logger.express = expressMiddleware.bind(logger);
    logger.expressError = expressErrorMiddleware as any;

    return (logger as any) as AckeeLogger;
};

let rootLogger: AckeeLogger;

const loggerFactory = (data: string | AckeeLoggerOptions = {}): AckeeLogger => {
    let moduleName: string | undefined;
    let options: AckeeLoggerOptions = {};
    if (data) {
        if (isString(data)) {
            moduleName = data as string;
        } else if (isObject(data)) {
            options = data as AckeeLoggerOptions;
        } else {
            throw new TypeError(`Invalid argument of type ${typeof data}`);
        }
    }

    if (!rootLogger) {
        rootLogger = defaultLogger(options);
    }
    if (!moduleName) {
        return rootLogger;
    }
    return (rootLogger.child({ name: moduleName }) as any) as AckeeLogger;
};

const factoryProxy = new Proxy(loggerFactory, {
    get: (target, key) => (target() as any)[key],
});

export default factoryProxy;
