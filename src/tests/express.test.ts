import * as express from 'express';
import 'jest-extended';
import { Writable } from 'stream';
import * as supertest from 'supertest';
import { levels } from '../levels';
import { testWriteStream } from './utils';

let loggerFactory;

beforeEach(() => {
    jest.resetModules();
    loggerFactory = require('..').default;
});

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

test('route can be ignored by logger options', () => {
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
        skip: (req: express.Request) => req.url === '/not-logged',
    });
    const app = express();
    const request = supertest(app);
    app.use(logger.express);
    return request.get('/not-logged').then(() => {
        expect(loggerWrites).not.toBeCalled();
    });
});

test('route can be ignored using regexp helper', () => {
    const { matchPath } = require('../utils');
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
        skip: matchPath(/heal.h/),
    });
    const app = express();
    const request = supertest(app);
    app.use(logger.express);
    return request.get('/healthcheck').then(() => {
        expect(loggerWrites).not.toBeCalled();
    });
});

test('user-agent is logged', () => {
    const loggerWrites = jest.fn();
    const logger = loggerFactory({
        streams: [
            {
                stream: new Writable({
                    write: (chunk, encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.message).toMatch('dummy agent');
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
    return request
        .get('/')
        .set('User-Agent', 'dummy agent')
        .then(() => {
            expect(loggerWrites).toBeCalled();
        });
});

test('missing user-agent is not logged', () => {
    const loggerWrites = jest.fn();
    const logger = loggerFactory({
        streams: [
            {
                stream: new Writable({
                    write: (chunk, encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.message).not.toMatch('undefined');
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
    return request
        .get('/')
        .unset('User-Agent')
        .then(() => {
            expect(loggerWrites).toBeCalled();
        });
});

test('response 5xx is logged at error level', () => {
    const loggerWrites = jest.fn();
    const logger = loggerFactory({
        streams: [
            {
                stream: new Writable({
                    write: (chunk, encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.level).toBe(levels.error);
                        loggerWrites();
                        next();
                    },
                }),
            },
        ],
        skip: (_req, res) => !res, // do not log request - log only response
    });

    const app = express();
    app.use(logger.express);
    app.get('/', (req, res) => {
        res.statusCode = 503;
        return res.send();
    });
    const request = supertest(app);
    return request.get('/').then(() => {
        expect(loggerWrites).toBeCalled();
    });
});
