const _ = require('lodash');
const pino = require('pino');
const multistream = require('pino-multi-stream').multistream;
const serializers = require('./serializers');
const { expressMiddleware, expressErrorMiddleware } = require('./express');

const levels = {
    silent: Infinity,
    fatal: 60,
    error: 50,
    warn: 40,
    info: 30,
    debug: 20,
    trace: 10,
};

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

    const isProduction = process.env.NODE_ENV === 'production';
    const isTesting = process.env.NODE_ENV === 'test';
    let defaultLevel = 'debug';

    if (isTesting) {
        defaultLevel = 'silent';
    }

    if (options.defaultLevel) {
        defaultLevel = options.defaultLevel;
    }

    let streams;
    if (isProduction) {
        streams = [
            { level: defaultLevel, stream: process.stdout, maxLevel: levels.warn },
            { level: levels.warn, stream: process.stderr },
        ];
    } else {
        // dev behavior = default
        streams = [
            { level: defaultLevel, stream: pretty, maxLevel: levels.warn },
            { level: levels.warn, stream: prettyErr },
        ];
    }

    if (options.streams) {
        streams = options.streams;
    }

    const logger = pino(
        { level: defaultLevel, timestamp: false, base: {}, serializers: serializers.serializers },
        multistream(streams)
    );
    logger.warning = logger.warn;

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
        if (_.isString(data)) {
            moduleName = data;
        } else if (_.isObject(data)) {
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
