const pick = require('pick-deep');
const omitDeep = require('omit-deep');
const stream = require('stream');
const express = require('express');
const supertest = require('supertest');

let loggerFactory;

beforeEach(() => {
    jest.resetModules();
    loggerFactory = require('..'); // eslint-disable-line global-require
});

test('Default serializers', () => {
    const loggerWrites = jest.fn();
    const error = {
        message: 'Bad error',
        code: 400,
        stack: 'Detailed stack',
        data: { user: 1 },
        devInfo: 'Lorem',
        userInfo: 'Ipsum',
    };
    const process = {
        env: {
            NODE_PATH: 'app:config',
            NODE_ENV: 'local',
            PATH: '.',
            USER: 'root',
        },
    };
    const res = {
        out: 'Lorem ipsum',
        time: 14,
        noteToSelf: 'Send to user',
    };
    const req = {
        body: {
            password: '1234',
            passwordCheck: '1234',
            catName: 'Cersei',
        },
        url: 'www.example.com',
        method: 'GET',
        extraData: 'Some server data',
    };

    const logger = loggerFactory({
        streams: [
            {
                stream: new stream.Writable({
                    write: (chunk, encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.error).toEqual(pick(error, ['message', 'code', 'stack', 'data']));
                        expect(json.process.env).toEqual({
                            nodePath: process.env.NODE_PATH,
                            nodeEnv: process.env.NODE_ENV,
                        });
                        const filteredReq = omitDeep(req, [
                            'body.password',
                            'body.passwordCheck',
                            'query.password',
                            'query.passwordCheck',
                        ]);
                        expect(json.req).toEqual(pick(filteredReq, ['url', 'body', 'query', 'method']));
                        expect(json.res).toEqual(pick(res, ['out', 'time']));
                        loggerWrites();
                        next();
                    },
                }),
            },
        ],
    });

    logger.info({ error, process, req, res });
    expect(loggerWrites).toBeCalled();
});

test('No extra fields are added in default serializers', () => {
    const loggerWrites = jest.fn();
    const error = {
        devInfo: 'Lorem',
        userInfo: 'Ipsum',
    };
    const process = {
        stuff: {
            NODE_PATH: 'app:config',
            NODE_ENV: 'local',
            PATH: '.',
            USER: 'root',
        },
    };
    const res = {
        noteToSelf: 'Send to user',
    };
    const req = {
        extraData: 'Some server data',
    };

    const logger = loggerFactory({
        streams: [
            {
                stream: new stream.Writable({
                    write: (chunk, encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.error).toEqual({});
                        expect(json.res).toEqual({});
                        expect(json.req).toEqual({});
                        expect(json.process).toEqual(process);
                        loggerWrites();
                        next();
                    },
                }),
            },
        ],
    });

    logger.info({ error, process, req, res });
    expect(loggerWrites).toBeCalled();
});

test('Disable custom path', () => {
    const loggerWrites = jest.fn();
    const req = {
        url: 'www.example.com',
        method: 'GET',
        extraData: 'Some server data',
    };

    const logger = loggerFactory({
        disableFields: ['req.url'],
        streams: [
            {
                stream: new stream.Writable({
                    write: (chunk, encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.req).toEqual(pick(req, ['body', 'query', 'method']));
                        loggerWrites();
                        next();
                    },
                }),
            },
        ],
    });

    logger.info({ req });
    expect(loggerWrites).toBeCalled();
});

test('Enable custom path', () => {
    const loggerWrites = jest.fn();
    const req = {
        url: 'www.example.com',
        method: 'GET',
        extraData: 'Some server data',
    };

    const logger = loggerFactory({
        enableFields: ['req.extraData'],
        streams: [
            {
                stream: new stream.Writable({
                    write: (chunk, encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.req).toEqual(pick(req, ['body', 'query', 'method', 'url', 'extraData']));
                        loggerWrites();
                        next();
                    },
                }),
            },
        ],
    });

    logger.info({ req });
    expect(loggerWrites).toBeCalled();
});

test('Some express headers are enabled by default', () => {
    const loggerWrites = jest.fn();
    const logger = loggerFactory({
        streams: [
            {
                stream: new stream.Writable({
                    write: (chunk, encoding, next) => {
                        const json = JSON.parse(chunk);
                        const validHeaders = ['x-deviceid', 'authorization', 'user-agent'];
                        validHeaders.forEach(header =>
                            expect(json.req.headers[header], `${header} header should be defined`).toBeDefined()
                        );
                        Object.keys(json.req.headers).forEach(header =>
                            expect(validHeaders.includes(header), `${header} header should not be defined`).toBe(true)
                        );
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
        .set('x-deviceid', '12345abcde')
        .set('Authorization', 'Basic pass')
        .set('User-Agent', 'Jest tests')
        .set('Age', 100)
        .then(() => {
            expect(loggerWrites).toBeCalled();
        });
});

test('Express fields and headers can be enabled', () => {
    const loggerWrites = jest.fn();
    const logger = loggerFactory({
        enableFields: ['req.protocol', 'req.headers.host'],
        streams: [
            {
                stream: new stream.Writable({
                    write: (chunk, encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.req.protocol).toBe('http');
                        expect(json.req.headers.host).toBe('localhost');
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
        .set('host', 'localhost')
        .then(() => {
            expect(loggerWrites).toBeCalled();
        });
});

test('Default express headers can be disabled', () => {
    const loggerWrites = jest.fn();
    const logger = loggerFactory({
        disableFields: ['req.headers.user-agent'],
        streams: [
            {
                stream: new stream.Writable({
                    write: (chunk, encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.req.headers['user-agent']).toBeUndefined();
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
        .set('x-deviceid', '1234')
        .then(() => {
            expect(loggerWrites).toBeCalled();
        });
});
