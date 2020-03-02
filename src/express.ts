import { ErrorRequestHandler, Request, RequestHandler, Response } from 'express';
import * as onFinished from 'on-finished';
import onHeaders = require('on-headers');
import { Cosmas } from './index';

const errorSymbol = Symbol.for('error');

type AckeeRequest = Request & { _startAt?: [number, number]; ackId?: string };
type AckeeResponse = Response & { _startAt?: [number, number]; time?: string; out?: object; [errorSymbol]?: any };

export type CosmasExpressMiddleware = (this: Cosmas, req: AckeeRequest, response: AckeeResponse, next: any) => void;

const expressOnHeaders = (req: AckeeRequest, res: AckeeResponse) => () => {
    res._startAt = process.hrtime();
    const diffFromSeconds = (res._startAt[0] - req._startAt![0]) * 1e3;
    const diffFromNanoseconds = (res._startAt[1] - req._startAt![1]) * 1e-6;
    const ms = diffFromSeconds + diffFromNanoseconds;
    res.time = ms.toFixed(3);
};

const shouldSkipLogging = (logger: Cosmas, req: AckeeRequest, res?: AckeeResponse) =>
    (logger.options.skip && logger.options.skip(req, res)) ||
    (logger.options.ignoredHttpMethods && logger.options.ignoredHttpMethods.includes(req.method));

const expressOnFinished = (logger: Cosmas, req: AckeeRequest) => (_err: Error | null, res: AckeeResponse) => {
    if (shouldSkipLogging(logger, req, res)) {
        return;
    }
    const error = res[errorSymbol];
    const userAgent = req.headers['user-agent'];
    const reqOut = `${res.statusCode} ${req.method} ${req.originalUrl}`;
    const standardOutput = {
        data: {
            req,
            res,
            userAgent,
            ackId: req.ackId,
        },
        message: `${reqOut} - Standard output`,
    };
    const errorOutput = {
        data: { ...standardOutput.data, error },
        message: `${reqOut} - Error handler at the end of app`,
    };
    const serverError = res.statusCode >= 500;

    const logFunction = error || serverError ? logger.error : res.out ? logger.info : logger.debug;
    const output = error ? errorOutput : standardOutput;

    logFunction.call(logger, output.data, output.message);
};

const expressMiddleware: RequestHandler = function(
    this: Cosmas,
    req: AckeeRequest,
    response: AckeeResponse,
    next: any
) {
    const reqIn = `--- ${req.method} ${req.originalUrl}`;
    if (!shouldSkipLogging(this, req)) {
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
