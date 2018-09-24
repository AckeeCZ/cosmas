const get = require('lodash.get');
const omit = require('lodash.omit');
const pick = require('lodash.pick');
const omitBy = require('lodash.omitby');
const defaultsDeep = require('lodash.defaultsdeep');
const isUndefined = require('lodash.isundefined');
const isEmpty = require('lodash.isempty');
const forEach = require('lodash.foreach');
const assign = require('lodash.assign');

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
        return omitBy(
            defaultsDeep({ env: omitBy({ nodePath, nodeEnv }, isUndefined) }, omit(obj, 'env')),
            val => isUndefined(val) || isEmpty(val)
        );
    },
    req(obj) {
        const omitFields = ['password', 'passwordCheck'];
        const [body, query] = ['body', 'query'].map(name => omit(get(obj, name), omitFields));

        return omitBy(
            {
                body,
                query,
                url: obj.originalUrl || obj.url,
                method: get(obj, 'method'),
            },
            val => isUndefined(val) || isEmpty(val)
        );
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
                return assign(originalResult, newFields);
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
