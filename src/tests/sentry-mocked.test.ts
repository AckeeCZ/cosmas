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
    test('can create logger with options', () => {
        expect(() => loggerFactory()).not.toThrowError();
        expect(() => loggerFactory({ sentryDsn: 'DSN' })).not.toThrowError();
    });

    test('sentry is called with correct scope', async () => {
        await new Promise((resolve, reject) => {
            const logger = loggerFactory({
                sentryDsn: 'DSN',
            });
            captureException.mockImplementation(createCapture(resolve));
            logger.info('Foo');
        });
        expect(captureException.mock.calls[0]).toMatchInlineSnapshot(`
            Array [
              Object {
                "level": 30,
                "message": "Foo",
                "v": 1,
              },
            ]
        `);
        expect(captureException.mock.results[0].value).toMatchInlineSnapshot(`
            Object {
              "data": Object {
                "level": 30,
                "message": "Foo",
                "v": 1,
              },
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
});
