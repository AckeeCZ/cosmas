import { ErrorRequestHandler, Request, RequestHandler, Response } from 'express';
import * as onFinished from 'on-finished';
import onHeaders = require('on-headers');
import { AckeeLogger } from '.';

const errorSymbol = Symbol.for('error');

type AckeeRequest = Request & { _startAt?: [number, number]; ackId?: string };
type AckeeResponse = Response & { _startAt?: [number, number]; time?: string; out?: object; [errorSymbol]?: any };

export type AckeeLoggerExpressMiddleware = (
    this: AckeeLogger,
    req: AckeeRequest,
    response: AckeeResponse,
    next: any
) => void;

const expressOnHeaders = (req: AckeeRequest, res: AckeeResponse) => () => {
    res._startAt = process.hrtime();
    const diffFromSeconds = (res._startAt[0] - req._startAt![0]) * 1e3;
    const diffFromNanoseconds = (res._startAt[1] - req._startAt![1]) * 1e-6;
    const ms = diffFromSeconds + diffFromNanoseconds;
    res.time = ms.toFixed(3);
};

const expressOnFinished = (logger: AckeeLogger, req: AckeeRequest) => (_err: Error | null, res: AckeeResponse) => {
    const error = res[errorSymbol];
    const userAgent = req.headers['user-agent'];
    const reqOut = `${res.statusCode} ${req.method} ${req.originalUrl} ${res.time} ms ${userAgent ? userAgent : ''}`;
    const standardOutput = {
        data: {
            req,
            res,
            ackId: req.ackId,
        },
        message: `${reqOut} - Standard output`,
    };

    if (error) {
        logger.error({ error, req, res, ackId: req.ackId }, `${reqOut} - Error handler at the end of app`);
    } else if (res.out) {
        logger.debug(standardOutput.data, standardOutput.message);
    } else {
        logger.info(standardOutput.data, standardOutput.message);
    }
};

const expressMiddleware: RequestHandler = function(
    this: AckeeLogger,
    req: AckeeRequest,
    response: AckeeResponse,
    next: any
) {
    const userAgent = req.headers['user-agent'];
    const reqIn = `--- ${req.method} ${req.originalUrl} ${userAgent ? userAgent : ''}`;
    if (this.options.ignoredHttpMethods && this.options.ignoredHttpMethods.includes(req.method)) {
        // entire method skipped - left here for BC
        return next();
    }
    if (!this.options.skip || !this.options.skip(req)) {
        // if request not skipped
        this.debug({ req, ackId: req.ackId }, `${reqIn} - Request accepted`);
    }
    req._startAt = process.hrtime();
    onHeaders(response, expressOnHeaders(req, response));
    onFinished(response, expressOnFinished(this, req));
    next();
};

const expressErrorMiddleware: ErrorRequestHandler = (error, _req, res, next) => {
    (res as any)[Symbol.for('error')] = error;
    next(error);
};

export { expressErrorMiddleware, expressMiddleware };
