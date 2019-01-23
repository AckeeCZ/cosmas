import { ErrorRequestHandler } from 'express';
import isObject = require('lodash.isobject');
import isString = require('lodash.isstring');
import * as pino from 'pino';
import * as pinoms from 'pino-multi-stream';
import { Writable } from 'stream';
import { AckeeLoggerExpressMiddleware, expressErrorMiddleware, expressMiddleware } from './express';
import { AckeeLoggerOptions } from './interfaces';
import * as serializers from './serializers';
import { initLoggerStreams } from './streams';

export type PinoLogger = pino.BaseLogger;
export type Level = pino.LevelWithSilent;

export interface AckeeLogger extends PinoLogger {
    warning: pino.LogFn;
    options: AckeeLoggerOptions;
    express: AckeeLoggerExpressMiddleware;
    expressError: ErrorRequestHandler;
    stream: Writable;
}

export interface AckeeLoggerFactory extends AckeeLogger {
    (data: string | AckeeLoggerOptions): AckeeLogger;
}

// This is a custom slightly edited version of pino-multistream's write method, which adds support for maximum log level
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
    serializers.disablePaths(options.disableFields);
    serializers.enablePaths(options.enableFields);

    const isTesting = process.env.NODE_ENV === 'test';
    const defaultLevel: Level = options.defaultLevel || (isTesting ? 'silent' : 'debug');
    const streams = initLoggerStreams(defaultLevel, options);

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
                messageKey: options.pretty ? 'msg' : 'message', // "message" is the best option for Google Stackdriver,
                serializers: serializers.serializers,
                timestamp: false,
            },
            options.config
        ),
        (pinoms as any).multistream(streams)
    ) as PinoLogger) as AckeeLogger;
    logger.warning = logger.warn;
    logger.options = options;

    // Add maxLevel support to pino-multi-stream
    // This could be replaced with custom pass-through stream being passed to multistream, which would filter the messages
    const streamMaxLevelWrite = maxLevelWrite.bind(logger.stream);
    logger.stream.write = (chunk: any) => {
        streamMaxLevelWrite(chunk);
        return true;
    };
    logger.express = expressMiddleware.bind(logger);
    logger.expressError = expressErrorMiddleware as any;

    return logger;
};

let rootLogger: AckeeLogger;

const parseLoggerData = (data: string | AckeeLoggerOptions = {}) => {
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
    return { moduleName, options };
};

const loggerFactory = (data: string | AckeeLoggerOptions = {}): AckeeLogger => {
    const { moduleName, options } = parseLoggerData(data);

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
}) as AckeeLoggerFactory;

export default factoryProxy;
