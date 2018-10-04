const get = require('lodash.get');
const omit = require('lodash.omit');
const forEach = require('lodash.foreach');
const { pick, removeEmpty } = require('./utils');

const serializers = {
    error(obj) {
        return {
            message: get(obj, 'message'),
            code: get(obj, 'code'),
            stack: get(obj, 'stack'),
            data: get(obj, 'data'),
        };
    },
    process(obj) {
        const nodePath = get(obj.env, 'NODE_PATH');
        const nodeEnv = get(obj.env, 'NODE_ENV');
        const filteredEnv = { env: removeEmpty({ nodePath, nodeEnv }) };
        return removeEmpty(Object.assign({}, filteredEnv, omit(obj, 'env')));
    },
    req(obj) {
        const omitFields = ['password', 'passwordCheck'];
        const [body, query] = ['body', 'query'].map(name => omit(get(obj, name), omitFields));

        return removeEmpty({
            body,
            query,
            url: obj.originalUrl || obj.url,
            method: get(obj, 'method'),
        });
    },
    res(obj) {
        return {
            out: get(obj, 'out'),
            time: get(obj, 'time'),
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
                return omit(value(obj), affectedFields);
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
