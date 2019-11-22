import { testWriteStream } from './utils';
import { setContext } from '@sentry/core';

let loggerFactory;
const captureException = jest.fn();
const captureMessage = jest.fn();

describe('sentry mocked', () => {
    beforeAll(() => {
        jest.mock('@sentry/node', () => {
            return {
                captureException,
            };
        });
        loggerFactory = require('..').default;
    });
    test('can create logger with options', () => {
        expect(() => loggerFactory()).not.toThrowError();
        expect(() => loggerFactory({ sentryDsn: 'DSN' })).not.toThrowError();
    });

    test('can use custom stream', async () => {
        await new Promise((resolve, reject) => {
            const logger = loggerFactory({
                sentryDsn: 'DSN',
            });
            captureException.mockImplementation(x => {
                resolve();
                console.log({ captureException: x });
            });
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
    });
});
