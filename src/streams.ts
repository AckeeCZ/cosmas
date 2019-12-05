import * as fs from 'fs';
import * as path from 'path';
import * as pino from 'pino';
import { Transform, TransformCallback } from 'stream';
import * as util from 'util';
import { loggerNameKey, pkgVersionKey } from '.';
import { CosmasOptions, CosmasStream } from './interfaces';
import { levels } from './levels';
import { StackDriverFormatStream } from './stackdriver';

const pkgJson = JSON.parse(fs.readFileSync(path.resolve(path.join(__dirname, '..', 'package.json')), 'utf8'));

const getDefaultTransformStream = (options: CosmasOptions & { messageKey: string; loggerName?: string }) => {
    class DefaultTransformStream extends Transform {
        // tslint:disable-next-line:function-name
        public _transform(chunk: any, _encoding: string, callback: TransformCallback) {
            const obj = JSON.parse(chunk);
            const loggerName = options.loggerName;
            let res;
            if (loggerName) {
                // always put logger name to message
                obj[options.messageKey] = `[${loggerName}] ${obj[options.messageKey]}`;
            }
            if (loggerName && !options.pretty) {
                // do not put logger name field to pretty outputs
                obj[loggerNameKey] = loggerName;
            }

            if (options.pretty) {
                res = util.inspect(obj, { colors: true, showHidden: true, depth: Infinity });
            } else {
                // do not put pkgVersion to pretty outputs
                obj[pkgVersionKey] = pkgJson.version;
                res = JSON.stringify(obj);
            }

            this.push(`${res}\n`);
            callback();
        }
    }
    return DefaultTransformStream;
};

const decorateStreams = <T extends Transform>(streams: CosmasStream[], streamClass: new () => T) => {
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

const initLoggerStreams = (
    defaultLevel: pino.LevelWithSilent,
    options: CosmasOptions & { messageKey: string; loggerName?: string }
) => {
    let streams: CosmasStream[];
    if (options.streams) {
        streams = options.streams.map(stream => Object.assign({ level: defaultLevel }, stream));
    } else {
        streams = [
            { level: defaultLevel, maxLevel: levels.warn, stream: process.stdout },
            { level: 'warn', stream: process.stderr },
        ];
    }
    if (!options.pretty && !options.disableStackdriverFormat) {
        streams = decorateStreams(streams, StackDriverFormatStream);
    }

    streams = decorateStreams(streams, getDefaultTransformStream(options));

    if (options.sentry) {
        const { createSentryTransformStream } = require('./sentry');
        streams = decorateStreams(streams, createSentryTransformStream(options));
    }

    return streams;
};

export { initLoggerStreams };
