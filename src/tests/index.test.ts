import * as express from 'express';
import 'jest-extended';
import { Writable } from 'stream';
import * as supertest from 'supertest';
import { levels } from '../levels';

let loggerFactory;

beforeEach(() => {
    jest.resetModules();
    loggerFactory = require('..').default;
});

test('can create default logger', () => {
    const logger = loggerFactory();
    expect(logger).toBeDefined();
});

test('can create named logger', () => {
    const logger = loggerFactory('myApp');
    expect(logger).toBeDefined();
});

const testWriteStream = (resolve, assert) => ({
    stream: new Writable({
        write: (chunk, encoding, next) => {
            const json = JSON.parse(chunk);
            assert(json);
            next();
            resolve();
        },
    }),
});

test('can use custom stream', () =>
    new Promise((resolve, reject) => {
        const logger = loggerFactory({
            streams: [testWriteStream(resolve, json => expect(json.message).toBe('Hello'))],
        });

        logger.info('Hello');
    }));

test('can use warning level', () =>
    new Promise((resolve, reject) => {
        const logger = loggerFactory({
            streams: [
                testWriteStream(resolve, json => {
                    expect(json.message).toBe('Hello');
                    expect(json.level).toBe(levels.warn);
                }),
            ],
        });

        logger.warning('Hello');
    }));

test('child logger has warning level', () =>
    new Promise((resolve, reject) => {
        loggerFactory({
            streams: [
                testWriteStream(resolve, json => {
                    expect(json.message).toContain('Hello');
                    expect(json.level).toBe(levels.warn);
                }),
            ],
        });
        const childLogger = loggerFactory('child');

        childLogger.warning('Hello');
    }));

test('express binds', () => {
    const logger = loggerFactory();
    const app = express();
    const request = supertest(app);
    app.use(logger.express);
    return request.get('/');
});

test('GET requests are logged by default', () =>
    new Promise((resolve, reject) => {
        const logger = loggerFactory({
            streams: [testWriteStream(resolve, json => expect(json.req.method).toBe('GET'))],
        });
        const app = express();
        const request = supertest(app);
        app.use(logger.express);
        request.get('/').then(() => null);
    }));

test('OPTIONS requests are ignored by default', () => {
    const loggerWrites = jest.fn();
    const logger = loggerFactory({
        streams: [
            {
                stream: new Writable({
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
            ignoredHttpMethods: [method],
            streams: [
                {
                    stream: new Writable({
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
        return request[method.toLowerCase()]('/').then(() => {
            expect(loggerWrites).not.toBeCalled();
        });
    });
});

test('severity field is automatically added to log object', () =>
    new Promise((resolve, reject) => {
        const logger = loggerFactory({
            streams: [testWriteStream(resolve, json => expect(json.severity).toBe('CRITICAL'))],
        });

        logger.fatal('Hello');
    }));

test('automatic severity field can be disabled by options', () =>
    new Promise((resolve, reject) => {
        const logger = loggerFactory({
            disableStackdriverFormat: true,
            streams: [testWriteStream(resolve, json => expect(json.severity).toBe(undefined))],
        });

        logger.fatal('Hello');
    }));

test('logger version is logged', () =>
    new Promise((resolve, reject) => {
        const logger = loggerFactory({
            streams: [testWriteStream(resolve, json => expect(json.pkgVersion).not.toBe(undefined))],
        });

        logger.fatal('Hello');
    }));

test('silent stream does not write', () => {
    const loggerWrites = jest.fn();
    const logger = loggerFactory({
        streams: [
            {
                stream: new Writable({
                    write: (chunk, encoding, next) => {
                        loggerWrites();
                        next();
                    },
                }),
                level: 'silent',
            },
        ],
    });

    logger.fatal('Hello');
    expect(loggerWrites).not.toBeCalled();
});

test('logger name is shown in non-pretty message', () =>
    new Promise((resolve, reject) => {
        const loggerName = 'database';
        loggerFactory({
            streams: [
                testWriteStream(resolve, json => {
                    expect(json.name).toBe(loggerName);
                    expect(json.message).toStartWith(`[${loggerName}] `);
                }),
            ],
        });
        const logger = loggerFactory(loggerName);

        logger.fatal('Hello');
    }));
