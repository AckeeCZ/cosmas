import { Transform } from 'stream';

const PINO_TO_STACKDRIVER = {
    10: 'DEBUG',
    20: 'DEBUG',
    30: 'INFO',
    40: 'WARNING',
    50: 'ERROR',
    60: 'CRITICAL',
};

class StackDriverFormatStream extends Transform {
    public _transform(chunk, encoding, callback) {
        const obj = JSON.parse(chunk);
        obj.severity = PINO_TO_STACKDRIVER[obj.level] || 'UNKNOWN';

        this.push(`${JSON.stringify(obj)}\n`);
        callback();
    }
}

export { StackDriverFormatStream };
