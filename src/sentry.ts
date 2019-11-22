import { Transform, TransformCallback } from 'stream';
import { withScope, captureException, captureMessage, Severity } from '@sentry/node';

class SentryTransformStream extends Transform {
    // tslint:disable-next-line:function-name
    public _transform(chunk: any, _encoding: string, callback: TransformCallback) {
        const PINO_TO_SENTRY: { [key: number]: Severity } = {
            10: Severity.Debug,
            20: Severity.Debug,
            30: Severity.Info,
            40: Severity.Warning,
            50: Severity.Error,
            60: Severity.Critical,
        };
        const obj = JSON.parse(chunk);
        captureException(obj);
        withScope(scope => {
            scope.setLevel(PINO_TO_SENTRY[obj.level]);
            scope.setContext('data', obj);
            if (obj.stack) {
                captureException(obj);
            } else {
                captureMessage(obj.message || obj);
            }
        });
        this.push(chunk);
        callback();
    }
}
export { SentryTransformStream };
