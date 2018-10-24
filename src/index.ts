import { ErrorRequestHandler } from 'express';
import isObject = require('lodash.isobject');
import isString = require('lodash.isstring');
import * as pino from 'pino';
import { BaseLogger as PinoLogger } from 'pino';
import { Level, LoggerOptions, multistream } from 'pino-multi-stream';
import { Writable } from 'stream';
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
    stream: Writable;
}

// This is a custom slightly edited version of pino-multistream's write method, whch adds support for maximum log level
// The original version was pino-multistream 4.0.0(commit 284439) - https://github.com/pinojs/pino-multi-stream/blob/28443984d06c43ffaf332165c1bd5395936bda25/multistream.js#L43
const maxLevelWrite: pino.WriteFn = function(this: any, data: object): void {
    let stream;
    const metadata = Symbol.for('pino.metadata');
    const level = this.lastLevel;
    const { streams } = this;
    for (const dest of streams) {
        stream = dest.stream;
        if (dest.level <= level) {
            if (!dest.maxLevel || (dest.maxLevel && level < dest.maxLevel)) {
                if (stream[metadata]) {
                    const { lastMsg, lastObj, lastLogger } = this;
                    stream.lastLevel = level;
                    stream.lastMsg = lastMsg;
                    stream.lastObj = lastObj;
                    stream.lastLogger = lastLogger;
                }
                stream.write(data);
            }
        } else {
            break;
        }
    }
};

const defaultLogger = (options: AckeeLoggerOptions = {}): AckeeLogger => {
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
    } else {
        streams = [
            { level: defaultLevel, maxLevel: 'warn', stream: process.stdout },
            { level: 'warn', stream: process.stderr },
        ];
    }
    if (options.pretty) {
        defaultMessageKey = 'msg'; // default pino - best option for pretty print
    }
    if (!options.disableStackdriverFormat) {
        streams = decorateStreams(streams, StackDriverFormatStream);
    }

    streams = decorateStreams(streams, DefaultTransformStream);

    if (!options.ignoredHttpMethods) {
        options.ignoredHttpMethods = ['OPTIONS'];
    }

    const logger = (pino(
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
            Object.assign({}, { prettyPrint: options.pretty }, options.config)
        ),
        multistream(streams)
    ) as PinoLogger) as AckeeLogger;
    logger.warning = logger.warn;
    logger.options = options;

    // Add maxLevel support to pino-multi-stream
    // This could be replaced with custom pass-through stream being passed to multistream, which would filter the messages
    const streamSym = (pino as any).symbols.streamSym;
    logger[streamSym].write = maxLevelWrite.bind(logger[streamSym]);
    logger.express = expressMiddleware.bind(logger);
    logger.expressError = expressErrorMiddleware as any;

    return logger;
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
