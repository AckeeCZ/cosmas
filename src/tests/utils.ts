import { Writable } from 'stream';

export type LogObject = { [x: string]: any };

export const testWriteStream = (resolve: (value: unknown) => void, assert: Function, isJson = true) => ({
    stream: new Writable({
        write: (chunk, _encoding, next) => {
            const json = isJson ? JSON.parse(chunk) : chunk.toString();
            assert(json);
            next();
            resolve(undefined);
        },
    }),
});
