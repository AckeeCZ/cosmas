import * as fs from 'fs';
import * as path from 'path';
import { LevelWithSilent } from 'pino';
import { Transform } from 'stream';

// this is basically enhanced version of pino-multi-stream.Streams type
export interface AckeeLoggerStream {
    level?: LevelWithSilent;
    maxLevel?: number; // this is not processed by pino, so we need the number directly
    stream: NodeJS.WritableStream;
}

const pkgJson = JSON.parse(fs.readFileSync(path.resolve(path.join(__dirname, '..', 'package.json')), 'utf8'));

class DefaultTransformStream extends Transform {
    public _transform(chunk: any, _encoding: string, callback: (error?: Error | undefined, data?: any) => void) {
        const obj = JSON.parse(chunk);
        obj.pkgVersion = pkgJson.version;

        this.push(`${JSON.stringify(obj)}\n`);
        callback();
    }
}

const decorateStreams = <T extends Transform>(streams: AckeeLoggerStream[], streamClass: { new (): T }) => {
    return streams.map(stream => {
        const newStream = new streamClass();
        newStream.pipe(stream.stream);
        return {
            level: stream.level,
            maxLevel: stream.maxLevel,
            stream: newStream,
        };
    });
};

export { decorateStreams, DefaultTransformStream };
