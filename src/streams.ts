import * as pino from 'pino';
import { Transform, TransformCallback } from 'stream';
import * as util from 'util';
import { CosmasOptions, CosmasStream } from './interfaces';
import { levels } from './levels';

const getDefaultTransformStream = (options: CosmasOptions & { messageKey: string; loggerName?: string }) => {
    class DefaultTransformStream extends Transform {
        // tslint:disable-next-line:function-name
        public _transform(chunk: any, _encoding: string, callback: TransformCallback) {
            const obj = JSON.parse(chunk);
            let res;

            if (options.pretty) {
                res = util.inspect(obj, { colors: true, showHidden: true, depth: Infinity });
            } else {
                res = JSON.stringify(obj);
            }

            this.push(`${res}\n`);
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
    defaultLevel: pino.LevelWithSilent,
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

    if (options.sentry) {
        const { createSentryTransformStream } = require('./sentry');
        streams = decorateStreams(streams, createSentryTransformStream(options));
    }

    return streams;
};

export { initLoggerStreams };
