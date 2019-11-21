import loggerFactory from '..';

jest.mock('@sentry/node', () => {});

test('can create logger with options', () => {
    expect(() => loggerFactory()).not.toThrowError();
    expect(() => loggerFactory({ sentryDsn: 'DSN' })).not.toThrowError();
});