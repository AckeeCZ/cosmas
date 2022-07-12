import * as express from 'express';
import 'jest-extended';
import { Writable } from 'stream';
import * as supertest from 'supertest';
import { CosmasFactory } from '..';
import { levels } from '../levels';
import { LogObject, testWriteStream } from './utils';

let loggerFactory: CosmasFactory;

beforeEach(() => {
    jest.resetModules();
    loggerFactory = require('../index').default;
});

test('express binds', () => {
    const logger = loggerFactory();
    const app = express();
    const request = supertest(app);
    app.use(logger.express);
    return request.get('/');
});

test('GET requests are logged by default', () =>
    new Promise((resolve, _reject) => {
        const logger = loggerFactory({
            streams: [testWriteStream(resolve, (json: LogObject) => expect(json.req.method).toBe('GET'))],
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
                    write: (_chunk, _encoding, next) => {
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

['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].forEach((method) => {
    test(`${method} HTTP method can be ignored by options`, () => {
        const loggerWrites = jest.fn();
        const logger = loggerFactory({
            ignoredHttpMethods: [method],
            streams: [
                {
                    stream: new Writable({
                        write: (_chunk, _encoding, next) => {
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
        return ((request as any)[method.toLowerCase()] as Function)('/').then(() => {
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
                    write: (_chunk, _encoding, next) => {
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
                    write: (_chunk, _encoding, next) => {
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

test('user-agent is not logged', () => {
    const loggerWrites = jest.fn();
    const logger = loggerFactory({
        streams: [
            {
                stream: new Writable({
                    write: (chunk, _encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.message).not.toMatch('dummy agent');
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
                    write: (chunk, _encoding, next) => {
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
                    write: (chunk, _encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.level).toBe(levels.error);
                        loggerWrites();
                        next();
                    },
                }),
            },
        ],
        skip: (_req: any, res: any) => !res, // do not log request - log only response
    });

    const app = express();
    app.use(logger.express);
    app.get('/', (_req, res) => {
        res.statusCode = 503;
        return res.send();
    });
    const request = supertest(app);
    return request.get('/').then(() => {
        expect(loggerWrites).toBeCalled();
    });
});

test('response headers', () => {
    const loggerWrites = jest.fn();
    const partialHeader = {
        'x-powered-by': 'Express',
    };

    const logger = loggerFactory({
        enableFields: ['res.headers'],
        streams: [
            {
                stream: new Writable({
                    write: (chunk, _encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.res.headers).not.toBeEmpty();
                        expect(json.res.headers).toMatchObject(partialHeader);
                        loggerWrites();
                        next();
                    },
                }),
            },
        ],
        skip: (_req: any, res: any) => !res, // do not log request - log only response
    });

    const app = express();
    app.use(logger.express);
    const request = supertest(app);
    return request.get('/').then(() => {
        expect(loggerWrites).toBeCalled();
    });
});
