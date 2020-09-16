import loggerFactory from '../index';

describe('sentry not available', () => {
    beforeAll(() => {
        jest.mock('@sentry/node', () => {
            throw new Error("Cannot find module '@sentry/node' from 'sentry.ts'");
        });
    });
    test('without sentry lib works by default, but crashes on provided', () => {
        expect(() => loggerFactory()).not.toThrowError();
        expect(() => {
            const extendSentry = require('../sentry').extendSentry;
            extendSentry(loggerFactory);
        }).toThrowErrorMatchingInlineSnapshot(`"Cannot find module '@sentry/node' from 'sentry.ts'"`);
    });
});
