import { Transform, TransformCallback } from 'stream';
import { captureException } from '@sentry/node';

class SentryTransformStream extends Transform {
    // tslint:disable-next-line:function-name
    public _transform(chunk: any, _encoding: string, callback: TransformCallback) {
        const obj = JSON.parse(chunk);
        captureException(obj);
        this.push(chunk);
        callback();
    }
}
export { SentryTransformStream };
