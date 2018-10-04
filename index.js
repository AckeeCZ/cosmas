const get = require('lodash.get');
const isString = require('lodash.isstring');
const isObject = require('lodash.isobject');
const pino = require('pino');
const multistream = require('pino-multi-stream').multistream;
const serializers = require('./serializers');
const { levels } = require('./levels');
const { expressMiddleware, expressErrorMiddleware } = require('./express');
const { StackDriverFormatStream } = require('./stackdriver');
const { decorateStreams, DefaultTransformStream } = require('./streams');

// This is a custom slightly edited version of pino-multistream's wirte method, whch adds support for maximum log level
// The original version was pino-multistream 3.1.2 (commit 71d98ae) - https://github.com/pinojs/pino-multi-stream/blob/71d98ae191e02c56e39e849d2c30d59c8c6db1b9/multistream.js#L43
const maxLevelWrite = function(data) {
    let dest;
    let stream;
    const needsMetadata = Symbol.for('needsMetadata');
    const level = this.lastLevel;
    const streams = this.streams;
    for (let i = 0; i < streams.length; i++) {
        dest = streams[i];
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

const defaultLogger = (options = {}) => {
    const pretty = pino.pretty();
    pretty.pipe(process.stdout);
    const prettyErr = pino.pretty();
    prettyErr.pipe(process.stderr);

    serializers.disablePaths(options.disableFields);
    serializers.enablePaths(options.enableFields);

    const isTesting = process.env.NODE_ENV === 'test';
    let defaultLevel = 'debug';

    if (isTesting) {
        defaultLevel = 'silent';
    }

    if (options.defaultLevel) {
        defaultLevel = options.defaultLevel;
    }

    let streams;
    let defaultMessageKey = 'message'; // best option for Google Stackdriver
    if (options.streams) {
        streams = options.streams;
    } else if (options.pretty) {
        streams = [
            { level: defaultLevel, stream: pretty, maxLevel: levels.warn },
            { level: levels.warn, stream: prettyErr },
        ];
        defaultMessageKey = 'msg'; // default pino - best option for pretty print
    } else {
        streams = [
            { level: defaultLevel, stream: process.stdout, maxLevel: levels.warn },
            { level: levels.warn, stream: process.stderr },
        ];
    }
    if (!get(options, 'disableStackdriverFormat', false)) {
        streams = decorateStreams(streams, StackDriverFormatStream);
    }

    streams = decorateStreams(streams, DefaultTransformStream);

    if (!options.ignoredHttpMethods) {
        options.ignoredHttpMethods = ['OPTIONS'];
    }

    const logger = pino(
        Object.assign(
            // no deep-merging needed, so assign is OK
            {},
            {
                level: defaultLevel,
                timestamp: false,
                base: {},
                serializers: serializers.serializers,
                messageKey: defaultMessageKey,
            },
            options.config
        ),
        multistream(streams)
    );
    logger.warning = logger.warn;
    logger.options = options;

    // Add maxLevel support to pino-multi-stream
    // This could be replaced with custom pass-through stream being passed to multistream, which would filter the messages
    logger.stream.write = maxLevelWrite.bind(logger.stream);

    logger.express = expressMiddleware.bind(logger);
    logger.expressError = expressErrorMiddleware;

    return logger;
};

let logger;

const loggerFactory = data => {
    let moduleName;
    let options;
    if (data) {
        if (isString(data)) {
            moduleName = data;
        } else if (isObject(data)) {
            options = data;
        } else {
            throw new TypeError(`Invalid argument of type ${typeof data}`);
        }
    }

    if (!logger) {
        logger = defaultLogger(options);
    }
    if (!moduleName) {
        return logger;
    }
    return logger.child({ name: moduleName });
};

const factoryProxy = new Proxy(loggerFactory, {
    get: (target, key) => target()[key],
});

module.exports = factoryProxy;
