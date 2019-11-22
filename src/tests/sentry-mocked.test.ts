let loggerFactory;
const scope: any = {};
const withScope = jest.fn(fn =>
    fn({
        setContext: (key: string, val: any) => {
            scope.context = { [key]: val };
        },
        setLevel: (level: any) => {
            scope.level = level;
        },
    })
);

const createCapture = (cb = () => {}) => data => {
    cb();
    return { data, scope };
};

const captureException = jest.fn(createCapture());
const captureMessage = jest.fn(createCapture());

describe('sentry mocked', () => {
    beforeAll(() => {
        jest.mock('@sentry/node', () => {
            return {
                captureException,
                captureMessage,
                withScope,
                Severity: {
                    Debug: 'debug',
                    Info: 'info',
                    Warning: 'warning',
                    Error: 'error',
                    Critical: 'critical',
                },
            };
        });
        loggerFactory = require('..').default;
    });
    beforeEach(() => {
        captureException.mockReset();
        captureMessage.mockReset();
    });
    test('can create logger with options', () => {
        expect(() => loggerFactory()).not.toThrowError();
        expect(() => loggerFactory({ sentryDsn: 'DSN' })).not.toThrowError();
    });

    test('sentry captureMessage is called with correct scope', async () => {
        await new Promise((resolve, reject) => {
            const logger = loggerFactory({
                sentryDsn: 'DSN',
            });
            captureMessage.mockImplementation(createCapture(resolve));
            logger.info('Foo');
        });
        expect(captureMessage).toHaveBeenCalledTimes(1);
        expect(captureException).not.toHaveBeenCalled();
        expect(captureMessage.mock.calls[0]).toMatchInlineSnapshot(`
            Array [
              "Foo",
            ]
        `);
        expect(captureMessage.mock.results[0].value).toMatchInlineSnapshot(`
            Object {
              "data": "Foo",
              "scope": Object {
                "context": Object {
                  "data": Object {
                    "level": 30,
                    "message": "Foo",
                    "v": 1,
                  },
                },
                "level": "info",
              },
            }
        `);
    });

    test('sentry captureException with stack and correct levels', async () => {
        await new Promise((resolve, reject) => {
            const logger = loggerFactory({
                sentryDsn: 'DSN',
            });
            captureException.mockReset();
            captureException.mockImplementation(createCapture(resolve));
            logger.error(new Error());
        });
        expect(captureException).toHaveBeenCalledTimes(1);
        expect(captureMessage).not.toHaveBeenCalled();
        expect(captureException.mock.results[0].value).toMatchObject({
            data: {
                level: 50,
                message: expect.any(String),
                stack: expect.any(String),
            },
            scope: {
                level: 'error',
            },
        });
    });
});
