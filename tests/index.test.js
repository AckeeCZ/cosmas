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
    const logger = loggerFactory({
        streams: [
            {
                stream: new stream.Writable({
                    write: (chunk, encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.message).toBe('Hello');
                        next();
                    },
                }),
            },
        ],
    });

    logger.info('Hello');
});

test('can use warning level', () => {
    const logger = loggerFactory({
        streams: [
            {
                stream: new stream.Writable({
                    write: (chunk, encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.message).toBe('Hello');
                        expect(json.level).toBe(levels.warn);
                        next();
                    },
                }),
            },
        ],
    });

    logger.warning('Hello');
});

test('express binds', () => {
    const logger = loggerFactory();
    const app = express();
    const request = supertest(app);
    app.use(logger.express);
    return request.get('/');
});
