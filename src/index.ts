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
    (childName: string): any;
}

export interface AckeeLoggerFactory extends AckeeLogger {
    (data?: string | AckeeLoggerOptions): AckeeLogger;
}

// cannot use Symbols, because they aren't JSON.stringifyable
export const loggerNameKey = 'cosmas.loggerName';
export const pkgVersionKey = 'cosmas.pkgVersion';

const makeCallable = <T extends object, F extends (...args: any[]) => any>(obj: T, fun: F): T & F =>
    new Proxy(fun as any, {
        get: (_target, key) => (obj as any)[key],
    });

const objEmpty = (obj: object) => Object.keys(obj).length === 0;

// This is a custom slightly edited version of pino-multistream's write method, which adds support for maximum log level
// The original version was pino-multistream 4.2.0 (commit bf7941f) - https://github.com/pinojs/pino-multi-stream/blob/bf7941f77661b6c14dd40840ff4a4db6897f08eb/multistream.js#L43
const maxLevelWrite: pino.WriteFn = function(this: any, data: object): void {
    let stream;
    const metadata = Symbol.for('pino.metadata');
    const level = this.lastLevel;
    const streams = this.streams;
    for (const dest of streams) {
        stream = dest.stream;
        // tslint:disable-next-line:early-exit
        if (dest.level <= level) {
            if (!dest.maxLevel || (dest.maxLevel && level < dest.maxLevel)) {
                if (stream[metadata]) {
                    // tslint:disable-next-line:no-this-assignment
                    const { lastTime, lastMsg, lastObj, lastLogger } = this;
                    stream.lastLevel = level;
                    stream.lastTime = lastTime;
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

const defaultLogger = (options: AckeeLoggerOptions & { loggerName?: string } = {}): AckeeLogger => {
    serializers.disablePaths(options.disableFields);
    serializers.enablePaths(options.enableFields);

    const isTesting = process.env.NODE_ENV === 'test';
    const defaultLevel: Level = options.defaultLevel || (isTesting ? 'silent' : 'debug');
    const messageKey = 'message'; // best option for Google Stackdriver,
    const streams = initLoggerStreams(defaultLevel, Object.assign({}, options, { messageKey }));

    options.ignoredHttpMethods = options.ignoredHttpMethods || ['OPTIONS'];

    const logger = (pino(
        // no deep-merging needed, so assign is OK
        Object.assign(
            {
                messageKey,
                base: {},
                level: defaultLevel,
                serializers: serializers.serializers,
                timestamp: false,
            },
            options.config
        ),
        (pinoms as any).multistream(streams)
    ) as PinoLogger) as AckeeLogger;

    if (options.sentryDsn) {
        const sentry = require('@sentry/node');
    }

    // Add maxLevel support to pino-multi-stream
    // This could be replaced with custom pass-through stream being passed to multistream, which would filter the messages
    const loggerStream = (logger as any)[(pino as any).symbols.streamSym] as any;
    const streamMaxLevelWrite = maxLevelWrite.bind(loggerStream);
    loggerStream.write = (chunk: any) => {
        streamMaxLevelWrite(chunk);
        return true;
    };
    return Object.assign(logger, {
        options,
        express: expressMiddleware.bind(logger),
        expressError: expressErrorMiddleware as any,
        warning: logger.warn,
    });
};

const parseLoggerData = (data: string | AckeeLoggerOptions = {}) => {
    let loggerName: string | undefined;
    let options: AckeeLoggerOptions = {};
    if (data) {
        if (isString(data)) {
            loggerName = data;
        } else if (isObject(data)) {
            options = data;
        } else {
            throw new TypeError(`Invalid argument of type ${typeof data}`);
        }
    }
    return { loggerName, options };
};

const loggerFactory = (data: string | AckeeLoggerOptions = {}, loggerOptions: AckeeLoggerOptions = {}): AckeeLogger => {
    const { loggerName, options } = parseLoggerData(data);
    loggerOptions = objEmpty(options) ? loggerOptions : options;
    const logger = defaultLogger(Object.assign({ loggerName }, loggerOptions));

    const loggerProxy = makeCallable(logger, (childName: string) => {
        const childLoggerName = [loggerName, childName].join('');
        const childOptions = loggerOptions;
        return loggerFactory(childLoggerName, childOptions);
    });
    return loggerProxy;
};

const factoryProxy = makeCallable(loggerFactory(), loggerFactory);

export default factoryProxy;
