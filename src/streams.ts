import * as fs from 'fs';
import * as path from 'path';
import * as pino from 'pino';
import { Transform, TransformCallback } from 'stream';
import * as util from 'util';
import { AckeeLoggerOptions, AckeeLoggerStream } from './interfaces';
import { levels } from './levels';
import { StackDriverFormatStream } from './stackdriver';

const isString = (x: any) => typeof x === 'string' || x instanceof String;

const pkgJson = JSON.parse(fs.readFileSync(path.resolve(path.join(__dirname, '..', 'package.json')), 'utf8'));

const getDefaultTransformStream = (options: AckeeLoggerOptions & { messageKey: string; loggerName?: string }) => {
    class DefaultTransformStream extends Transform {
        // tslint:disable-next-line:function-name
        public _transform(chunk: any, _encoding: string, callback: TransformCallback) {
            const obj = JSON.parse(chunk);
            const loggerName = options.loggerName;
            let res;
            if (options.pretty) {
                // obj['name\0'] = obj.name; // add null character so that it is not interpreted by pino-pretty but still visible to user unchanged
                delete obj.name;
                if (loggerName) {
                    obj.name = loggerName;
                }
                res = util.inspect(obj, { colors: true, showHidden: true, depth: 10 });
            } else {
                obj.pkgVersion = pkgJson.version;
                if (obj[options.messageKey] && isString(obj[options.messageKey]) && loggerName) {
                    obj[options.messageKey] = `[${loggerName}] ${obj[options.messageKey]}`;
                }
                res = JSON.stringify(obj);
            }

            this.push(`${res}\n`);
            callback();
        }
    }
    return DefaultTransformStream;
};

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

const initLoggerStreams = (
    defaultLevel: pino.LevelWithSilent,
    options: AckeeLoggerOptions & { messageKey: string; loggerName?: string }
) => {
    let streams: AckeeLoggerStream[];
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
    return streams;
};

export { initLoggerStreams };
