import pino from 'pino';
import { Transform, TransformCallback } from 'stream';
import * as util from 'util';
import { CosmasOptions, CosmasStream } from './interfaces';
import { levels } from './levels';

const getDefaultTransformStream = (options: CosmasOptions & { messageKey: string; loggerName?: string }) => {
    class DefaultTransformStream extends Transform {
        // tslint:disable-next-line:function-name
        public _transform(chunk: any, _encoding: string, callback: TransformCallback) {
            if (options.pretty) {
                const res = util.inspect(JSON.parse(chunk), { colors: true, showHidden: true, depth: Infinity });
                this.push(`${res}\n`);
            } else {
                this.push(chunk);
            }
            callback();
        }
    }
    return DefaultTransformStream;
};

const decorateStreams = <T extends Transform>(streams: CosmasStream[], streamClass: new () => T) => {
    return streams.map((stream) => {
        const newStream = new streamClass();
        newStream.pipe(stream.stream);
        return {
            level: stream.level,
            maxLevel: stream.maxLevel,
            stream: newStream,
        };
    });
};

const initLoggerStreams = (
    defaultLevel: pino.Level,
    options: CosmasOptions & { messageKey: string; loggerName?: string }
) => {
    let streams: CosmasStream[];
    if (options.streams) {
        streams = options.streams.map((stream) => Object.assign({ level: defaultLevel }, stream));
    } else {
        streams = [
            { level: defaultLevel, maxLevel: levels.warn, stream: process.stdout },
            { level: 'warn', stream: process.stderr },
        ];
    }

    streams = decorateStreams(streams, getDefaultTransformStream(options));

    return streams;
};

export { initLoggerStreams };
