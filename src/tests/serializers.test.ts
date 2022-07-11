import * as express from 'express';
import omitDeep = require('omit-deep');
import pick = require('pick-deep');
import { Writable } from 'stream';
import * as supertest from 'supertest';
import { CosmasFactory } from '..';

let loggerFactory: CosmasFactory;

beforeEach(() => {
    jest.resetModules();
    loggerFactory = require('..').default;
});

test('Default serializers', () => {
    const loggerWrites = jest.fn();
    const error = {
        code: 400,
        data: { user: 1 },
        devInfo: 'Lorem',
        message: 'Bad error',
        stack: 'Detailed stack',
        userInfo: 'Ipsum',
    };
    const process = {
        env: {
            NODE_ENV: 'local',
            NODE_PATH: 'app:config',
            PATH: '.',
            USER: 'root',
        },
    };
    const res = {
        noteToSelf: 'Send to user',
        out: 'Lorem ipsum',
        time: 14,
    };
    const req = {
        body: {
            catName: 'Cersei',
            password: '1234',
            passwordCheck: '1234',
        },
        extraData: 'Some server data',
        method: 'GET',
        url: 'www.example.com',
    };

    const logger = loggerFactory({
        streams: [
            {
                stream: new Writable({
                    write: (chunk, _encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.error).toEqual(pick(error, ['message', 'code', 'stack', 'data']));
                        expect(json.process.env).toEqual({
                            nodeEnv: process.env.NODE_ENV,
                            nodePath: process.env.NODE_PATH,
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
            NODE_ENV: 'local',
            NODE_PATH: 'app:config',
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
                stream: new Writable({
                    write: (chunk, _encoding, next) => {
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
        extraData: 'Some server data',
        method: 'GET',
        url: 'www.example.com',
    };

    const logger = loggerFactory({
        disableFields: ['req.url'],
        streams: [
            {
                stream: new Writable({
                    write: (chunk, _encoding, next) => {
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
    expect(req).toMatchObject({
        extraData: 'Some server data',
        method: 'GET',
        url: 'www.example.com',
    });
});

test('Disable path without default serializer', () => {
    const loggerWrites = jest.fn();
    const data = {
        customData: 'Some server data',
        test: 'test',
    };

    const logger = loggerFactory({
        disableFields: ['data.customData'],
        streams: [
            {
                stream: new Writable({
                    write: (chunk, _encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.data).toEqual(pick(data, 'test'));
                        loggerWrites();
                        next();
                    },
                }),
            },
        ],
    });

    logger.info({ data });
    expect(loggerWrites).toBeCalled();
    expect(data).toMatchObject({
        customData: 'Some server data',
        test: 'test',
    });
});

test('Disable field without default serializer', () => {
    const loggerWrites = jest.fn();
    const data = {
        customData: {
            test: 'Some server data',
        },
        test: 'test',
    };

    const logger = loggerFactory({
        disableFields: ['data'],
        streams: [
            {
                stream: new Writable({
                    write: (chunk, _encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.data).toEqual({});
                        loggerWrites();
                        next();
                    },
                }),
            },
        ],
    });

    logger.info({ data });
    expect(loggerWrites).toBeCalled();
});

test('Disable fields without default serializer from 1 object', () => {
    const loggerWrites = jest.fn();
    const data = {
        customData: {
            test: 'Some server data',
        },
        customData2: 'Some another data',
        test: 'test',
    };

    const logger = loggerFactory({
        disableFields: ['data.customData', 'data.customData2'],
        streams: [
            {
                stream: new Writable({
                    write: (chunk, _encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.data).toEqual(pick(data, 'test'));
                        loggerWrites();
                        next();
                    },
                }),
            },
        ],
    });

    logger.info({ data });
    expect(loggerWrites).toBeCalled();
});

test('Enable custom path', () => {
    const loggerWrites = jest.fn();
    const req = {
        extraData: 'Some server data',
        method: 'GET',
        url: 'www.example.com',
    };

    const logger = loggerFactory({
        enableFields: ['req.extraData'],
        streams: [
            {
                stream: new Writable({
                    write: (chunk, _encoding, next) => {
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

test('Enable all from response', () => {
    const loggerWrites = jest.fn();
    const res = {
        out: 'out data',
        test: 'test',
    };

    const logger = loggerFactory({
        enableFields: ['res'],
        streams: [
            {
                stream: new Writable({
                    write: (chunk, _encoding, next) => {
                        const json = JSON.parse(chunk);
                        expect(json.res).toEqual(res);
                        loggerWrites();
                        next();
                    },
                }),
            },
        ],
    });

    logger.info({ res });
    expect(loggerWrites).toBeCalled();
});

test('Some express headers are enabled by default', () => {
    const loggerWrites = jest.fn();
    const logger = loggerFactory({
        streams: [
            {
                stream: new Writable({
                    write: (chunk, _encoding, next) => {
                        const json = JSON.parse(chunk);
                        const validHeaders = ['x-deviceid', 'authorization', 'user-agent'];
                        validHeaders.forEach((header) => expect(json.req.headers[header]).toBeDefined());
                        Object.keys(json.req.headers).forEach((header) =>
                            expect(validHeaders.includes(header)).toBe(true)
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
        .set('Age', '100')
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
                stream: new Writable({
                    write: (chunk, _encoding, next) => {
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
                stream: new Writable({
                    write: (chunk, _encoding, next) => {
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
