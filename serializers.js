const forEach = require('lodash.foreach');
const { pick, removeEmpty, deleteKeys } = require('./utils');

const serializers = {
    error(obj) {
        return {
            message: obj.message,
            code: obj.code,
            stack: obj.stack,
            data: obj.data,
        };
    },
    process(obj) {
        if (!obj.env) {
            return obj;
        }
        const nodePath = obj.env.NODE_PATH;
        const nodeEnv = obj.env.NODE_ENV;
        const filteredEnv = { env: removeEmpty({ nodePath, nodeEnv }) };
        const { env, ...rest } = obj;
        return removeEmpty(Object.assign({}, filteredEnv, rest));
    },
    req(obj) {
        const [body, query] = ['body', 'query'].map(name => {
            const source = obj[name];
            if (source) {
                const { password, passwordCheck, ...rest } = source;
                return rest;
            }
            return source;
        });

        return removeEmpty({
            body,
            query,
            url: obj.originalUrl || obj.url,
            method: obj.method,
        });
    },
    res(obj) {
        return {
            out: obj.out,
            time: obj.time,
        };
    },
};

const disablePaths = paths => {
    if (!paths || paths.length <= 0) {
        return;
    }
    forEach(serializers, (value, key) => {
        const matcher = new RegExp(`^${key}.(.*)`);
        const affectedFields = [];
        paths.forEach(field => {
            field.replace(matcher, (match, p1) => {
                affectedFields.push(p1);
            });
        });

        if (affectedFields.length > 0) {
            const newSerializer = obj => {
                const objCopy = JSON.parse(JSON.stringify(obj)); // we will loose info about functions being passed to logger, but that's a really specific use case, so probably OK
                return deleteKeys(value(objCopy), affectedFields);
            };
            serializers[key] = newSerializer;
        }
    });
};

const enablePaths = paths => {
    if (!paths || paths.length <= 0) {
        return;
    }
    forEach(serializers, (value, key) => {
        const matcher = new RegExp(`^${key}.(.*)`);
        const affectedFields = [];
        paths.forEach(field => {
            field.replace(matcher, (match, p1) => {
                affectedFields.push(p1);
            });
        });

        if (affectedFields.length > 0) {
            const newSerializer = obj => {
                const newFields = pick(obj, affectedFields);
                const originalResult = value(obj);
                return Object.assign({}, originalResult, newFields);
            };
            serializers[key] = newSerializer;
        }
    });
};

module.exports = {
    serializers,
    enablePaths,
    disablePaths,
};
