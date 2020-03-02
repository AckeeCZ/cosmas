import 'jest-extended';
import isString = require('lodash.isstring');
import { Writable } from 'stream';
import loggerFactory, { pkgVersionKey, loggerNameKey } from '../index';
import { levels } from '../levels';
import { testWriteStream } from './utils';

test('can create default logger', () => {
    const logger = loggerFactory();
    expect(logger).toBeDefined();
});

test('can create named logger', () => {
    const logger = loggerFactory('myApp');
    expect(logger).toBeDefined();
    expect((logger.options as any).loggerName).toBe('myApp');
});

test('can create logger with options', () => {
    const logger = loggerFactory({ pretty: true });
    expect(logger).toBeDefined();
    expect(logger.options.pretty).toBe(true);
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
            streams: [testWriteStream(resolve, json => expect(json[pkgVersionKey]).not.toBe(undefined))],
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
    { type: 'message-key', logData: { message: 'You gotta do, what you gotta do', name: 'Futurama' } },
    { type: 'msg-key', logData: { msg: 'Mirror, mirror, on the wall', name: 'Sleeping Beauty' } },
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
                        expect(json[loggerNameKey]).toBe(loggerName);
                        if ((data.logData as any).name) {
                            expect(json.name).toBe((data.logData as any).name);
                        }
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
                    testWriteStream(
                        resolve,
                        message => {
                            expect(message).toContain(loggerName);
                            if ((data.logData as any).name) {
                                expect(message).toContain((data.logData as any).name);
                            }
                        },
                        false
                    ),
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

test('multiple logger configs are not affected', () => {
    const primaryLogger = loggerFactory({ disableStackdriverFormat: true, ignoredHttpMethods: ['POST'] });
    const secondaryLogger = loggerFactory({ disableStackdriverFormat: false, ignoredHttpMethods: ['GET'] });

    expect(primaryLogger.options.disableStackdriverFormat).toBe(true);
    expect(primaryLogger.options.ignoredHttpMethods).toIncludeSameMembers(['POST']);
    expect(secondaryLogger.options.disableStackdriverFormat).toBe(false);
    expect(secondaryLogger.options.ignoredHttpMethods).toIncludeSameMembers(['GET']);
});

test('Child logger takes parent config', () => {
    const logger = loggerFactory({ disableStackdriverFormat: true });
    const childLogger = logger('child');

    expect(childLogger.options.disableStackdriverFormat).toBe(true);
});

test('Child logger inherits parent name', () => {
    const logger = loggerFactory('parent', { disableStackdriverFormat: true });
    const childLogger = logger('child');

    expect(childLogger.options.loggerName).toBe('parentchild');
});

test('Child logger can create another child', () => {
    const logger = loggerFactory('parent', { disableStackdriverFormat: true });
    const childLogger = logger('child');
    const kid = childLogger('grandkid');

    expect(kid.options.loggerName).toBe('parentchildgrandkid');
});
