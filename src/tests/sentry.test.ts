import loggerFactory from '..';

describe('sentry not available', () => {
    beforeAll(() => {
        jest.mock('@sentry/node', () => {
            throw new Error("Cannot find module '@sentry/node' from 'index.ts'");
        });
    });
    test('without sentry lib works by default, but crashes on provided', () => {
        expect(() => loggerFactory()).not.toThrowError();
        expect(() => loggerFactory({ sentry: 'DSN' })).toThrowErrorMatchingInlineSnapshot(
            `"Cannot find module '@sentry/node' from 'index.ts'"`
        );
    });
});
