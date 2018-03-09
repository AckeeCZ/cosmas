// https://gist.github.com/tothandras/bc06910063015b8891ff0fbb909c68c2
// https://github.com/trentm/node-bunyan#levels
// https://news.ycombinator.com/item?id=14209168
// https://tools.ietf.org/html/rfc5424

const _ = require('lodash');
const pino = require('pino');
const multistream = require('pino-multi-stream').multistream;
const serializers = require('./serializers');

// options.disableFields = ['error.stack'];

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
        streams = [{ level: defaultLevel, stream: process.stdout }, { level: 'warn', stream: process.stderr }];
    } else {
        // dev behavior = default
        streams = [{ level: defaultLevel, stream: pretty }, { level: 'warn', stream: prettyErr }];
    }

    if (options.streams) {
        streams = options.streams;
    }

    const logger = pino({ level: defaultLevel, timestamp: false, base: {}, serializers }, multistream(streams));
    logger.warning = logger.warn;

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
