import 'jest-extended';
import isString = require('lodash.isstring');
import { Writable } from 'stream';
import loggerFactory from '..';
import { levels } from '../levels';

test('can create default logger', () => {
    const logger = loggerFactory();
    expect(logger).toBeDefined();
});

test('can create named logger', () => {
    const logger = loggerFactory('myApp');
    expect(logger).toBeDefined();
    expect((logger.options as any).loggerName).toBe('myApp');
});

test.skip('can create logger with options', () => {
    const logger = loggerFactory({ pretty: true });
    expect(logger).toBeDefined();
    expect(logger.options.pretty).toBe(true);
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
        const rootLogger = loggerFactory({
            streams: [
                testWriteStream(resolve, json => {
                    expect(json.message).toContain('Hello');
                    expect(json.level).toBe(levels.warn);
                }),
            ],
        });
        const childLogger = rootLogger('child');

        childLogger.warning('Hello');
    }));

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

const exampleMessages = [
    { type: 'simple', logData: 'Hello' },
    { type: 'message-key', logData: { message: 'You gotta do, what you gotta do' } },
    { type: 'msg-key', logData: { message: 'Mirror, mirror, on the wall' } },
];

exampleMessages.forEach(data => {
    test(`logger name is shown in non-pretty ${data.type} message`, () =>
        new Promise(resolve => {
            const loggerName = 'database';
            const rootLogger = loggerFactory({
                pretty: false,
                streams: [
                    testWriteStream(resolve, json => {
                        expect(json.message).toStartWith(`[${loggerName}] `);
                    }),
                ],
            });
            const logger = rootLogger(loggerName);

            if (isString(data.logData)) {
                logger.fatal(data.logData);
            } else {
                logger.fatal(data.logData, 'Data');
            }
        }));
});

exampleMessages.forEach(data => {
    test(`logger name is propagated to pretty object with ${data.type} message`, () =>
        new Promise(resolve => {
            const loggerName = 'database';
            const rootLogger = loggerFactory({
                pretty: true,
                streams: [
                    testWriteStream(resolve, json => {
                        expect(json.name).toEqual(loggerName);
                    }),
                ],
            });
            const logger = rootLogger(loggerName);

            if (isString(data.logData)) {
                logger.fatal(data.logData);
            } else {
                logger.fatal(data.logData, 'Data');
            }
        }));
});
