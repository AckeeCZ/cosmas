import { captureException, captureMessage, Severity, withScope } from '@sentry/node';
import { Transform, TransformCallback } from 'stream';
import { CosmasOptions } from './interfaces';
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

export const createSentryTransformStream = (options: CosmasOptions): any => {
    return class SentryTransformStream extends Transform {
        // tslint:disable-next-line:function-name
        public _transform(chunk: any, _encoding: string, callback: TransformCallback) {
            const obj = JSON.parse(chunk);
            if ((options.sentryLevel || levels.warn) <= obj.level) {
                withScope(scope => {
                    scope.setLevel(PINO_TO_SENTRY[obj.level]);
                    scope.setExtras(obj);
                    reportToSentry(obj);
                });
            }
            this.push(chunk);
            callback();
        }
    };
};
