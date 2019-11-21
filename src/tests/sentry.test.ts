import loggerFactory from '..';

jest.mock('@sentry/node', () => {
    throw new Error("Cannot find module '@sentry/node' from 'index.ts'");
});

test('without sentry lib works by default, but crashes on provided', () => {
    expect(() => loggerFactory()).not.toThrowError();
    expect(() => loggerFactory({ sentryDsn: 'DSN' })).toThrowErrorMatchingInlineSnapshot(
        `"Cannot find module '@sentry/node' from 'index.ts'"`
    );
});