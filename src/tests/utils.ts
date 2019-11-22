import { Writable } from 'stream';

export const testWriteStream = (resolve, assert, isJson = true) => ({
    stream: new Writable({
        write: (chunk, encoding, next) => {
            const json = isJson ? JSON.parse(chunk) : chunk.toString();
            assert(json);
            next();
            resolve();
        },
    }),
});