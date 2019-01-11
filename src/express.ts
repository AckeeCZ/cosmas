import { ErrorRequestHandler, Request, RequestHandler, Response } from 'express';
import * as onFinished from 'on-finished';
import onHeaders = require('on-headers');
import { AckeeLogger } from '.';

const errorSymbol = Symbol.for('error');

export type AckeeLoggerExpressMiddleware = (
    this: AckeeLogger,
    req: Request & { _startAt?: [number, number]; ackId?: string },
    response: Response & { _startAt?: [number, number]; time?: string; out?: object; [errorSymbol]?: any },
    next: any
) => void;

const expressMiddleware: RequestHandler = function(
    this: AckeeLogger,
    req: Request & { _startAt?: [number, number]; ackId?: string },
    response: Response & { _startAt?: [number, number]; time?: string; out?: object; [errorSymbol]?: any },
    next: any
) {
    const reqIn = `--- ${req.method} ${req.originalUrl} ${req.headers['user-agent']}`;
    this.debug({ req, ackId: req.ackId }, `${reqIn} - Request accepted`);
    req._startAt = process.hrtime();
    onHeaders(response, () => {
        response._startAt = process.hrtime();
        const diffFromSeconds = (response._startAt[0] - req._startAt![0]) * 1e3;
        const diffFromNanoseconds = (response._startAt[1] - req._startAt![1]) * 1e-6;
        const ms = diffFromSeconds + diffFromNanoseconds;
        response.time = ms.toFixed(3);
    });
    onFinished(response, (_err, res) => {
        const error = res[errorSymbol];
        const reqOut = `${res.statusCode} ${req.method} ${req.originalUrl} ${res.time} ms ${req.headers['user-agent']}`;
        if (this.options.ignoredHttpMethods && this.options.ignoredHttpMethods.includes(req.method)) {
            return;
        }
        const standardOutput = {
            data: {
                req,
                res,
                ackId: req.ackId,
            },
            message: `${reqOut} - Standard output`,
        };

        if (error) {
            this.error({ error, req, res, ackId: req.ackId }, `${reqOut} - Error handler at the end of app`);
        } else if (res.out) {
            this.debug(standardOutput.data, standardOutput.message);
        } else {
            this.info(standardOutput.data, standardOutput.message);
        }
    });
    next();
};

const expressErrorMiddleware: ErrorRequestHandler = (error, _req, res, next) => {
    (res as any)[Symbol.for('error')] = error;
    next(error);
};

export { expressErrorMiddleware, expressMiddleware };
