const _ = require('lodash');
const stream = require('stream');

let loggerFactory;

beforeEach(() => {
    jest.resetModules();
    loggerFactory = require('..'); // eslint-disable-line global-require
});

test('Default serializers', () => {
    const error = {
        message: 'Bad error',
        code: 400,
        stack: 'Detailed stack',
        data: { user: 1 },
        devInfo: 'Lorem',
        userInfo: 'Ipsum',
    };
    const processEnv = {
        NODE_PATH: 'app:config',
        NODE_ENV: 'local',
        PATH: '.',
        USER: 'root',
    };
    const res = {
        out: 'Lorem ipsum',
        time: 14,
        noteToSelf: 'Send to user',
    };
    const req = {
        query: {
            password: '1234',
            passwordCheck: '1234',
            search: 'my cat',
        },
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
                        expect(json.error).toEqual(_.pick(error, ['message', 'code', 'stack', 'data']));
                        expect(json.processEnv).toEqual({
                            nodePath: processEnv.NODE_PATH,
                            nodeEnv: processEnv.NODE_ENV,
                        });
                        expect(json.req).toEqual(
                            _.pick(
                                _.omit(req, [
                                    'body.password',
                                    'body.passwordCheck',
                                    'query.password',
                                    'query.passwordCheck',
                                ]),
                                ['url', 'body', 'query', 'method']
                            )
                        );
                        expect(json.res).toEqual(_.pick(res, ['out', 'time']));
                        next();
                    },
                }),
            },
        ],
    });

    logger.info({ error, processEnv, req, res });
});

test('Disable custom path', () => {
    const req = {
        body: {},
        query: {},
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
                        expect(json.req).toEqual(_.pick(req, ['body', 'query', 'method']));
                        next();
                    },
                }),
            },
        ],
    });

    logger.info({ req });
});

test('Enable custom path', () => {
    const req = {
        body: {},
        query: {},
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
                        expect(json.req).toEqual(_.pick(req, ['body', 'query', 'method', 'url', 'extraData']));
                        next();
                    },
                }),
            },
        ],
    });

    logger.info({ req });
});
