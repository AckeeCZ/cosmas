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

const simpleStreams = [{ level: 'trace', stream: pretty }, { level: 'error', stream: prettyErr }];

const logger = pino({ level: 'trace' }, multistream(simpleStreams));

logger.warning = logger.warn;

const loggerFactory = moduleName => {
    if (!moduleName) {
        return logger;
    }
    return logger.child({ name: moduleName });
};

module.exports = loggerFactory;
