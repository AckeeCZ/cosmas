import { Transform } from 'stream';

const PINO_TO_STACKDRIVER: { [key: number]: string } = {
    10: 'DEBUG',
    20: 'DEBUG',
    30: 'INFO',
    40: 'WARNING',
    50: 'ERROR',
    60: 'CRITICAL',
};

class StackDriverFormatStream extends Transform {
    // tslint:disable-next-line:function-name
    public _transform(chunk: any, _encoding: string, callback: (error?: Error | undefined, data?: any) => void) {
        const obj = JSON.parse(chunk);
        if (obj.name) {
            obj.message = `[${obj.name}] ${obj.message}`;
        }
        obj.severity = PINO_TO_STACKDRIVER[obj.level] || 'UNKNOWN';

        this.push(`${JSON.stringify(obj)}\n`);
        callback();
    }
}

export { StackDriverFormatStream };
