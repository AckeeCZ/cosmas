import * as fs from 'fs';
import * as path from 'path';
import * as pino from 'pino';
import { Transform } from 'stream';
import { AckeeLoggerOptions, AckeeLoggerStream } from './interfaces';
import { levels } from './levels';
import { StackDriverFormatStream } from './stackdriver';

const pkgJson = JSON.parse(fs.readFileSync(path.resolve(path.join(__dirname, '..', 'package.json')), 'utf8'));

class DefaultTransformStream extends Transform {
    public _transform(chunk: any, _encoding: string, callback: (error?: Error | undefined, data?: any) => void) {
        const obj = JSON.parse(chunk);
        obj.pkgVersion = pkgJson.version;

        this.push(`${JSON.stringify(obj)}\n`);
        callback();
    }
}

const decorateStreams = <T extends Transform>(streams: AckeeLoggerStream[], streamClass: new () => T) => {
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

const initLoggerStreams = (defaultLevel: pino.LevelWithSilent, options: AckeeLoggerOptions = {}) => {
    const pretty = pino.pretty();
    pretty.pipe(process.stdout);
    const prettyErr = pino.pretty();
    prettyErr.pipe(process.stderr);

    let streams: AckeeLoggerStream[];
    if (options.streams) {
        streams = options.streams;
    } else if (options.pretty) {
        streams = [
            { level: defaultLevel, maxLevel: levels.warn, stream: pretty },
            { level: 'warn', stream: prettyErr },
        ];
    } else {
        streams = [
            { level: defaultLevel, maxLevel: levels.warn, stream: process.stdout },
            { level: 'warn', stream: process.stderr },
        ];
    }
    if (!options.disableStackdriverFormat) {
        streams = decorateStreams(streams, StackDriverFormatStream);
    }

    streams = decorateStreams(streams, DefaultTransformStream);

    return streams;
};

export { initLoggerStreams };
