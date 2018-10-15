const onFinished = require('on-finished');
const onHeaders = require('on-headers');

const expressMiddleware = function(req, response, next) {
    const reqIn = `--- ${req.method} ${req.originalUrl} ${req.headers['user-agent']}`;
    this.debug({ req, ackId: req.ackId }, `${reqIn} - Request accepted`);
    req._startAt = process.hrtime();
    onHeaders(response, () => {
        response._startAt = process.hrtime();
        const diffFromSeconds = (response._startAt[0] - req._startAt[0]) * 1e3;
        const diffFromNanoseconds = (response._startAt[1] - req._startAt[1]) * 1e-6;
        const ms = diffFromSeconds + diffFromNanoseconds;
        response.time = ms.toFixed(3);
    });
    onFinished(response, (err, res) => {
        const error = res[Symbol.for('error')];
        const reqOut = `${res.statusCode} ${req.method} ${req.originalUrl} ${res.time} ms ${req.headers['user-agent']}`;
        if (this.options.ignoredHttpMethods.includes(req.method)) {
            return;
        }
        if (error) {
            this.error({ error, req, res, ackId: req.ackId }, `${reqOut} - Error handler at the end of app`);
        } else if (res.out) {
            this.debug({ req, res, ackId: req.ackId }, `${reqOut} - Standard output`);
        } else {
            this.info({ req, res, ackId: req.ackId }, `${reqOut} - Standard output`);
        }
    });
    next();
};

const expressErrorMiddleware = (error, req, res, next) => {
    res[Symbol.for('error')] = error;
    next(error);
};

module.exports = {
    expressMiddleware,
    expressErrorMiddleware,
};
