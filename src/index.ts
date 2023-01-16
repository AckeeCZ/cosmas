import { ErrorRequestHandler } from 'express';
import * as fs from 'fs';
import isObject = require('lodash.isobject');
import isString = require('lodash.isstring');
import * as path from 'path';
import { pino } from 'pino';
import { Writable } from 'stream';
import { CosmasExpressMiddleware, expressErrorMiddleware, expressMiddleware } from './express';
import { CosmasOptions } from './interfaces';
import { levels } from './levels';
import * as serializers from './serializers';
import { initLoggerStreams } from './streams';

export type PinoLogger = pino.BaseLogger;
export type PinoHooks = { logMethod: (inputArgs: any, method: any) => void };

export interface Cosmas extends PinoLogger {
    warning: pino.LogFn;
    options: CosmasOptions;
    express: CosmasExpressMiddleware;
    expressError: ErrorRequestHandler;
    stream: Writable;
    realHooks: PinoHooks;
    (childName: string): Cosmas;
}

export interface CosmasFactory extends Cosmas {
    (data?: string | CosmasOptions, loggerOptions?: CosmasOptions): Cosmas;
}

// cannot use Symbols, because they aren't JSON.stringifyable
export const loggerNameKey = 'cosmas.loggerName';
export const pkgVersionKey = 'cosmas.pkgVersion';

const PINO_TO_STACKDRIVER: { [key: number]: string } = {
    10: 'DEBUG',
    20: 'DEBUG',
    30: 'INFO',
    40: 'WARNING',
    50: 'ERROR',
    60: 'CRITICAL',
};

const makeCallable = <T extends object, F extends (...args: any[]) => any>(obj: T, fun: F): T & F =>
    new Proxy(fun as any, {
        get: (_target, key) => (obj as any)[key],
    });

const objEmpty = (obj: object) => Object.keys(obj).length === 0;

const initFormatters = (options: CosmasOptions & { loggerName?: string }) => {
    const pkgPath = path.resolve(path.join(__dirname, '..', 'package.json'));
    const pkgJson = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, 'utf8')) : undefined;

    const formatters: pino.LoggerOptions['formatters'] = {};
    if (!options.pretty && !options.disableStackdriverFormat) {
        formatters.level = (_label: string, level: number) => {
            return { level, severity: PINO_TO_STACKDRIVER[level] || 'UNKNOWN' };
        };
    }

    // do not put logger name field to pretty outputs
    formatters.log = (object: { [key: string]: any }) => {
        if (options.pretty) return object;

        if (pkgJson) {
            // put pkgVersion to non-pretty outputs
            object[pkgVersionKey] = pkgJson.version;
        }
        if (options.loggerName) {
            object[loggerNameKey] = options.loggerName;
        }
        return object;
    };
    return formatters;
};

const initHooks = (options: CosmasOptions & { loggerName?: string }) => {
    const realHooks: PinoHooks = {
        logMethod(inputArgs, method) {
            return method.apply(this, inputArgs);
        },
    };
    const hooks: PinoHooks = {
        logMethod(inputArgs, method) {
            return realHooks.logMethod.call(this, inputArgs, method);
        },
    };
    if (!options.loggerName) return { hooks, realHooks };
    // always put logger name to message
    realHooks.logMethod = function (inputArgs, method) {
        const text = inputArgs[inputArgs.length - 1];
        if (typeof text === 'string' || text instanceof String) {
            inputArgs[inputArgs.length - 1] = `[${options.loggerName}] ${text}`;
        }
        return method.apply(this, inputArgs);
    };
    return { hooks, realHooks };
};

const defaultLogger = (options: CosmasOptions & { loggerName?: string } = {}): Cosmas => {
    serializers.disablePaths(options.disableFields);
    serializers.enablePaths(options.enableFields);

    const defaultLevel: pino.Level = options.defaultLevel || 'debug';
    const messageKey = 'message'; // best option for Google Stackdriver,
    const streams = initLoggerStreams(defaultLevel, Object.assign({}, options, { messageKey }));

    const formatters = initFormatters(options);
    const { hooks, realHooks } = initHooks(options);

    options.ignoredHttpMethods = options.ignoredHttpMethods || ['OPTIONS'];
    const logger = pino(
        // no deep-merging needed, so assign is OK
        Object.assign(
            {
                messageKey,
                formatters,
                hooks,
                base: {},
                level: defaultLevel,
                serializers: serializers.serializers,
                timestamp: pino.stdTimeFunctions.isoTime,
                customLevels: {
                    warning: levels.warn,
                },
            },
            options.config
        ),
        pino.multistream(streams, { dedupe: true })
    ) as PinoLogger as Cosmas;

    return Object.assign(logger, {
        options,
        realHooks,
        express: expressMiddleware.bind(logger),
        expressError: expressErrorMiddleware as any,
    });
};

const parseLoggerData = (data: string | CosmasOptions = {}) => {
    let loggerName: string | undefined;
    let options: CosmasOptions = {};
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

const loggerFactory = (data: string | CosmasOptions = {}, loggerOptions: CosmasOptions = {}): Cosmas => {
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

const factoryProxy: CosmasFactory = makeCallable(loggerFactory(), loggerFactory);

export default factoryProxy;
