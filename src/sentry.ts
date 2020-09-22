import { captureException, captureMessage, Severity, withScope } from '@sentry/node';
import * as pino from 'pino';
import { Cosmas } from '.';
import { levels } from './levels';

const reportToSentry = (obj: any) => {
    if (!obj.stack) {
        return captureMessage(obj.message || obj);
    }
    const error = new Error(obj.message);
    error.message = obj.message;
    error.stack = obj.stack;
    error.name = obj.name;
    return captureException(error);
};

const PINO_TO_SENTRY: { [key: number]: Severity } = {
    10: Severity.Debug,
    20: Severity.Debug,
    30: Severity.Info,
    40: Severity.Warning,
    50: Severity.Error,
    60: Severity.Critical,
};

export const extendSentry = (logger: Cosmas, options: { sentry: string | true; sentryLevel: number }) => {
    const sentry = require('@sentry/node');
    if (typeof options.sentry === 'string') {
        sentry.init({ dsn: options.sentry });
    }

    const originalWrite = logger[pino.symbols.streamSym].write;
    // unfortunately, this is the only place in pino, we can hook onto, where we can be sure all
    // the hooks, formatters and serializers are already applied
    logger[pino.symbols.streamSym].write = function (s: string) {
        originalWrite.call(this, s);
        const obj = JSON.parse(s);
        if (obj.level < (options.sentryLevel || levels.warn)) return;
        withScope((scope) => {
            scope.setLevel(PINO_TO_SENTRY[obj.level]);
            scope.setExtras(obj);
            reportToSentry(obj);
        });
    };
};
