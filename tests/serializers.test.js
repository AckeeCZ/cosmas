const { pick } = require('../utils');
const omitDeep = require('omit-deep');
const stream = require('stream');

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
