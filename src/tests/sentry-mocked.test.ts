import { Scope } from '@sentry/node';
import omit = require('omit-deep');
import { Cosmas, CosmasFactory, CosmasSentry } from '../index';
import { levels } from '../levels';

let loggerFactory: CosmasFactory;
let extendSentry: (logger: Cosmas, options: { sentry: string | true; sentryLevel?: number }) => CosmasSentry;
const scope: any = {};
const withScope = jest.fn((fn) =>
    fn({
        setContext: (key: string, val: any) => {
            scope.context = { [key]: val };
        },
        setExtras: (val: any) => {
            scope.extras = val;
        },
        setLevel: (level: any) => {
            scope.level = level;
        },
        setTags: (val: any) => {
            scope.tags = val;
        },
    })
);

const createCapture = (cb = () => {}) => (data) => {
    cb();
    return { data, scope };
};

const captureException = jest.fn(createCapture());
const captureMessage = jest.fn(createCapture());
const init = jest.fn();

describe('sentry mocked', () => {
    beforeAll(() => {
        jest.mock('@sentry/node', () => {
            return {
                captureException,
                captureMessage,
                withScope,
                init,
                Severity: {
                    Debug: 'debug',
                    Info: 'info',
                    Warning: 'warning',
                    Error: 'error',
                    Critical: 'critical',
                },
            };
        });
        loggerFactory = require('../index').default;
        extendSentry = require('../sentry').extendSentry;
    });
    beforeEach(() => {
        captureException.mockReset();
        captureMessage.mockReset();
    });
    test('can create logger with options', () => {
        expect(() => loggerFactory()).not.toThrowError();
        expect(() => extendSentry(loggerFactory, { sentry: true })).not.toThrowError();
        expect(init).not.toHaveBeenCalled();
        expect(() => extendSentry(loggerFactory, { sentry: 'dummy' })).not.toThrowError();
        expect(init.mock.calls[0]).toMatchInlineSnapshot(`
            Array [
              Object {
                "dsn": "dummy",
              },
            ]
        `);
    });

    test('sentry captureMessage is called with correct scope (respects sentry level)', async () => {
        const dateNow = Date.now;
        Date.now = jest.fn(() => 1520343036000);
        await new Promise((resolve, reject) => {
            const logger = loggerFactory();
            extendSentry(logger, {
                sentry: 'DSN',
                sentryLevel: levels.fatal,
            });
            captureMessage.mockImplementation(createCapture(resolve));
            // expect to trigger only fatal
            logger.trace('trace');
            logger.debug('debug');
            logger.info('info');
            logger.warn('warn');
            logger.error('error');
            logger.fatal('fatal');
        });
        expect(captureMessage).toHaveBeenCalledTimes(1);
        expect(captureException).not.toHaveBeenCalled();
        expect(captureMessage.mock.calls[0]).toMatchInlineSnapshot(`
            Array [
              "fatal",
            ]
        `);
        expect(captureMessage.mock.results[0].value.scope.extras['cosmas.pkgVersion']).toBeDefined();
        expect(omit(captureMessage.mock.results[0].value, 'cosmas.pkgVersion')).toMatchInlineSnapshot(`
            Object {
              "data": "fatal",
              "scope": Object {
                "extras": Object {
                  "level": 60,
                  "message": "fatal",
                  "severity": "CRITICAL",
                  "time": "2018-03-06T13:30:36.000Z",
                },
                "level": "critical",
              },
            }
        `);
        Date.now = dateNow;
    });

    test('sentry captureException with stack and correct levels', async () => {
        await new Promise((resolve, reject) => {
            const originalLogger = loggerFactory();
            const logger = extendSentry(originalLogger, { sentry: 'DSN' });
            captureException.mockReset();
            captureException.mockImplementation(createCapture(resolve));
            logger.error(new Error());
        });
        expect(captureException).toHaveBeenCalledTimes(1);
        expect(captureMessage).not.toHaveBeenCalled();
        expect(captureException.mock.results[0].value).toMatchObject({
            data: expect.any(Error),
            scope: {
                level: 'error',
            },
        });
    });

    test('can pass sentry tags, context and extras', async () => {
      console.log('thist trest');
        const dateNow = Date.now;
        Date.now = jest.fn(() => 1520343036000);
        await new Promise((resolve, reject) => {
            const originalLogger = loggerFactory();
            const logger = extendSentry(originalLogger, { sentry: 'DSN' });
            captureMessage.mockImplementation(createCapture(resolve));
            logger.fatal({ name: 'John Doe' }, 'sentryData', (scope: Scope) => {
                scope.setContext('dummyContext', { foo: 'bar' });
                scope.setTags({ first: 'firstTag' });
                scope.setExtras({ extra: 'extraValue' });
            });
        });
        expect(captureMessage).toHaveBeenCalledTimes(1);
        expect(captureException).not.toHaveBeenCalled();
        expect(captureMessage.mock.calls[0]).toMatchInlineSnapshot(`
            Array [
              "sentryData",
            ]
        `);
        expect(omit(captureMessage.mock.results[0].value, 'cosmas.pkgVersion')).toMatchInlineSnapshot(`
            Object {
              "data": "sentryData",
              "scope": Object {
                "context": Object {
                  "dummyContext": Object {
                    "foo": "bar",
                  },
                },
                "extras": Object {
                  "extra": "extraValue",
                },
                "level": "critical",
                "tags": Object {
                  "first": "firstTag",
                },
              },
            }
        `);
        Date.now = dateNow;
    });

    test('can pass sentry tags, context and extras with 3 params', async () => {
        const dateNow = Date.now;
        Date.now = jest.fn(() => 1520343036000);
        await new Promise((resolve, reject) => {
            const originalLogger = loggerFactory();
            const logger = extendSentry(originalLogger, { sentry: 'DSN' });
            captureMessage.mockImplementation(createCapture(resolve));
            logger.fatal('sentryfatal', (scope: Scope) => {
                scope.setContext('dummyContext', { foo: 'bar' });
                scope.setTags({ first: 'firstTag' });
                scope.setExtras({ extra: 'extraValue' });
            });
        });
        expect(captureMessage).toHaveBeenCalledTimes(1);
        expect(captureException).not.toHaveBeenCalled();
        expect(captureMessage.mock.calls[0]).toMatchInlineSnapshot(`
            Array [
              "sentryfatal",
            ]
        `);
        expect(omit(captureMessage.mock.results[0].value, 'cosmas.pkgVersion')).toMatchInlineSnapshot(`
            Object {
              "data": "sentryfatal",
              "scope": Object {
                "context": Object {
                  "dummyContext": Object {
                    "foo": "bar",
                  },
                },
                "extras": Object {
                  "extra": "extraValue",
                },
                "level": "critical",
                "tags": Object {
                  "first": "firstTag",
                },
              },
            }
        `);
        Date.now = dateNow;
    });
});
