// https://gist.github.com/tothandras/bc06910063015b8891ff0fbb909c68c2
// https://github.com/trentm/node-bunyan#levels
// https://news.ycombinator.com/item?id=14209168
// https://tools.ietf.org/html/rfc5424

const pino = require('pino');
const multistream = require('pino-multi-stream').multistream;

const pretty = pino.pretty();
pretty.pipe(process.stdout);
const prettyErr = pino.pretty();
prettyErr.pipe(process.stderr);

const loggerFactory = (moduleName, options = {}) => {
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

    const logger = pino({ level: defaultLevel, timestamp: false, base: {} }, multistream(streams));
    logger.warning = logger.warn;
    if (!moduleName) {
        return logger;
    }
    return logger.child({ name: moduleName });
};

module.exports = loggerFactory;
