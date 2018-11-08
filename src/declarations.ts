declare module 'omit-deep' {
    function omitDeep(value: object | object[], keys: string | string[]): object;
    export = omitDeep;
}

declare module 'pick-deep' {
    function pickDeep(obj: object, paths: string | string[], separator?: string): object;
    export = pickDeep;
}

declare module 'pino-multi-stream' {

}

// there is a @typed/pino-multi-stream package, but it has wrong type in its Streams definition. So until its fixed, we use this
/* declare module 'pino-multi-stream' {
    import {
        LevelWithSilent as PinoLevel,
        Logger as PinoLogger,
        LoggerOptions as PinoLoggerOptions,
        stdSerializers as pinoStdSerializers,
    } from 'pino';
    import stream = require('stream');

    type Streams = Array<{ stream: NodeJS.WritableStream; level?: Level }>;
    interface LoggerOptions extends PinoLoggerOptions {
        streams?: Streams;
    }
    const stdSerializers: typeof pinoStdSerializers;

    function multistream(streams: Streams): stream.Writable;
    type Level = PinoLevel;
    type Logger = PinoLogger;

    function pinoms(options: LoggerOptions): Logger;
    interface pinoms {
        multistream(streams: Streams): stream.Writable;
        (options: LoggerOptions): Logger;
    }
    export = pinoms;
}*/
