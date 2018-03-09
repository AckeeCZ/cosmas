const _ = require('lodash');

/**
 * Gets full URL from express Req object
 * @param {Req} req
 * @return {!string}
 */
const fullUrlFromReq = req => (req.get ? `${req.protocol}://${req.get('host')}${req.originalUrl}` : '');

module.exports = {
    error(obj) {
        return {
            message: _.get(obj, 'message'),
            code: _.get(obj, 'code'),
            stack: _.get(obj, 'stack'),
            data: _.get(obj, 'data'),
        };
    },
    processEnv(obj) {
        return {
            nodePath: _.get(obj, 'NODE_PATH'),
            nodeEnv: _.get(obj, 'NODE_ENV'),
        };
    },
    req(obj) {
        const body = _.cloneDeep(_.get(obj, 'body'));
        const query = _.cloneDeep(_.get(obj, 'query'));

        if (_.get(body, 'password')) {
            delete body.password;
        }

        if (_.get(query, 'password')) {
            delete query.password;
        }

        if (_.get(body, 'passwordCheck')) {
            delete body.passwordCheck;
        }

        if (_.get(query, 'passwordCheck')) {
            delete query.passwordCheck;
        }

        return {
            body,
            query,
            url: fullUrlFromReq(obj),
            method: _.get(obj, 'method'),
        };
    },
    res(obj) {
        return {
            out: _.get(obj, 'out'),
        };
    },
};
