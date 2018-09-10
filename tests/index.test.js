const express = require('express');
const supertest = require('supertest');
const stream = require('stream');
const { levels } = require('../levels');

let loggerFactory;

beforeEach(() => {
    jest.resetModules();
    loggerFactory = require('..'); // eslint-disable-line global-require
});

test('can create default logger', () => {
    const logger = loggerFactory();
    expect(logger).toBeDefined();
});

test('can create named logger', () => {
    const logger = loggerFactory('myApp');
    expect(logger).toBeDefined();
});

test('can use custom stream', () => {
    const loggerWrites = jest.fn();
    const logger = loggerFactory({
        streams: [
            {
                stream: new stream.Writable({
                    write: (chunk, encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.message).toBe('Hello');
                        loggerWrites();
                        next();
                    },
                }),
            },
        ],
    });

    logger.info('Hello');
    expect(loggerWrites).toBeCalled();
});

test('can use warning level', () => {
    const loggerWrites = jest.fn();
    const logger = loggerFactory({
        streams: [
            {
                stream: new stream.Writable({
                    write: (chunk, encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.message).toBe('Hello');
                        expect(json.level).toBe(levels.warn);
                        loggerWrites();
                        next();
                    },
                }),
            },
        ],
    });

    logger.warning('Hello');
    expect(loggerWrites).toBeCalled();
});

test('express binds', () => {
    const logger = loggerFactory();
    const app = express();
    const request = supertest(app);
    app.use(logger.express);
    return request.get('/');
});

test('GET requests are logged by default', () => {
    const loggerWrites = jest.fn();
    const logger = loggerFactory({
        streams: [
            {
                stream: new stream.Writable({
                    write: (chunk, encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.req.method).toBe('GET');
                        loggerWrites();
                        next();
                    },
                }),
            },
        ],
    });
    const app = express();
    const request = supertest(app);
    app.use(logger.express);
    return request.get('/').then(() => {
        expect(loggerWrites).toBeCalled();
    });
});

test('OPTIONS requests are ignored by default', () => {
    const loggerWrites = jest.fn();
    const logger = loggerFactory({
        streams: [
            {
                stream: new stream.Writable({
                    write: (chunk, encoding, next) => {
                        loggerWrites();
                        next();
                    },
                }),
            },
        ],
    });
    const app = express();
    const request = supertest(app);
    app.use(logger.express);
    return request.options('/').then(() => {
        expect(loggerWrites).not.toBeCalled();
    });
});

['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].forEach(method => {
    test(`${method} HTTP method can be ignored by options`, () => {
        const loggerWrites = jest.fn();
        const logger = loggerFactory({
            streams: [
                {
                    stream: new stream.Writable({
                        write: (chunk, encoding, next) => {
                            loggerWrites();
                            next();
                        },
                    }),
                },
            ],
            ignoredHttpMethods: [method],
        });
        const app = express();
        const request = supertest(app);
        app.use(logger.express);
        return request[method.toLowerCase()]('/').then(() => {
            expect(loggerWrites).not.toBeCalled();
        });
    });
});

test('severity field is automatically added to log object', () => {
    const loggerWrites = jest.fn();
    const logger = loggerFactory({
        streams: [
            {
                stream: new stream.Writable({
                    write: (chunk, encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.severity).toBe('CRITICAL');
                        loggerWrites();
                        next();
                    },
                }),
            },
        ],
    });

    logger.fatal('Hello');
    expect(loggerWrites).toBeCalled();
});

test('automatic severity field can be disabled by options', () => {
    const loggerWrites = jest.fn();
    const logger = loggerFactory({
        disableStackdriverFormat: true,
        streams: [
            {
                stream: new stream.Writable({
                    write: (chunk, encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.severity).toBe(undefined);
                        loggerWrites();
                        next();
                    },
                }),
            },
        ],
    });

    logger.fatal('Hello');
    expect(loggerWrites).toBeCalled();
});
