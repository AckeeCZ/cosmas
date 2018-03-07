const loggerFactory = require('..');
const { redirect } = require('./helper');

test('can create default logger', () => {
    const logger = loggerFactory();
    expect(logger).toBeDefined();
});

test('can create named logger', () => {
    const logger = loggerFactory('myApp');
    expect(logger).toBeDefined();
});

test('can use custom stream', () => {
    const logger = loggerFactory('', {
        streams: [
            {
                stream: redirect((chunk, enc, cb) => {
                    expect(chunk.msg).toBe('Hello');
                    cb();
                }),
            },
        ],
    });

    logger.info('Hello');
});

test('can use warning level', () => {
    const logger = loggerFactory('', {
        streams: [
            {
                stream: redirect((chunk, enc, cb) => {
                    expect(chunk.msg).toBe('Hello');
                    cb();
                }),
            },
        ],
    });

    logger.warning('Hello');
});
