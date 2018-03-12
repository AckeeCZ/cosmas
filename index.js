// https://gist.github.com/tothandras/bc06910063015b8891ff0fbb909c68c2
// https://github.com/trentm/node-bunyan#levels
// https://news.ycombinator.com/item?id=14209168
// https://tools.ietf.org/html/rfc5424

const _ = require('lodash');
const pino = require('pino');
const onFinished = require('on-finished');
const onHeaders = require('on-headers');
const multistream = require('pino-multi-stream').multistream;
const serializers = require('./serializers');

const levels = {
    silent: Infinity,
    fatal: 60,
    error: 50,
    warn: 40,
    info: 30,
    debug: 20,
    trace: 10,
};

// options.disableFields = ['error.stack'];
// options.enableFields = ['req.protocol'];

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

const expressMiddleware = function(req, response, next) {
    this.debug({ req, ackId: req.ackId }, 'Request accepted');
    req._startAt = process.hrtime();
    onHeaders(response, () => {
        response._startAt = process.hrtime();
        const diffFromSeconds = (response._startAt[0] - req._startAt[0]) * 1e3;
        const diffFromNanoseconds = (response._startAt[1] - req._startAt[1]) * 1e-6;
        const ms = diffFromSeconds + diffFromNanoseconds;
        response.time = ms.toFixed(3);
    });
    onFinished(response, (err, res) => {
        const error = res[Symbol.for('error')];
        if (error) {
            this.error({ error, req, res, ackId: req.ackId }, 'Error handler at the end of app');
        } else if (res.out) {
            this.debug({ req, res, ackId: req.ackId }, `Standard output [${res.statusCode}]`);
        } else {
            this.info({ req, res, ackId: req.ackId }, `Standard output [${res.statusCode}]`);
        }
    });
    next();
};

const expressErrorMiddleware = (error, req, res, next) => {
    res[Symbol.for('error')] = error;
    next(error);
};

const defaultLogger = (options = {}) => {
    const pretty = pino.pretty();
    pretty.pipe(process.stdout);
    const prettyErr = pino.pretty();
    prettyErr.pipe(process.stderr);

    if (options.disableFields) {
        _.forEach(serializers, (value, key) => {
            const matcher = new RegExp(`^${key}.(.*)`);
            const affectedFields = [];
            options.disableFields.forEach(field => {
                field.replace(matcher, (match, p1) => {
                    affectedFields.push(p1);
                });
            });

            if (affectedFields.length > 0) {
                const newSerializer = obj => {
                    return _.omit(value(obj), affectedFields);
                };
                serializers[key] = newSerializer;
            }
        });
    }

    if (options.enableFields) {
        _.forEach(serializers, (value, key) => {
            const matcher = new RegExp(`^${key}.(.*)`);
            const affectedFields = [];
            options.enableFields.forEach(field => {
                field.replace(matcher, (match, p1) => {
                    affectedFields.push(p1);
                });
            });

            if (affectedFields.length > 0) {
                const newSerializer = obj => {
                    const newFields = _.pick(obj, affectedFields);
                    const originalResult = value(obj);
                    return _.assign(originalResult, newFields);
                };
                serializers[key] = newSerializer;
            }
        });
    }

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

    const logger = pino({ level: defaultLevel, timestamp: false, base: {}, serializers }, multistream(streams));
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
