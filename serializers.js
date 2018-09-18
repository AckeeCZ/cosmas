const _ = require('lodash');

const serializers = {
    error(obj) {
        return {
            message: _.get(obj, 'message'),
            code: _.get(obj, 'code'),
            stack: _.get(obj, 'stack'),
            data: _.get(obj, 'data'),
        };
    },
    process(obj) {
        const nodePath = _.get(obj.env, 'NODE_PATH');
        const nodeEnv = _.get(obj.env, 'NODE_ENV');
        return _.omitBy(
            _.defaultsDeep({ env: _.omitBy({ nodePath, nodeEnv }, _.isUndefined) }, _.omit(obj, 'env')),
            val => _.isUndefined(val) || _.isEmpty(val)
        );
    },
    req(obj) {
        const omitFields = ['password', 'passwordCheck'];
        const [body, query] = ['body', 'query'].map(name => _.omit(_.get(obj, name), omitFields));

        return _.omitBy(
            {
                body,
                query,
                url: obj.originalUrl || obj.url,
                method: _.get(obj, 'method'),
            },
            val => _.isUndefined(val) || _.isEmpty(val)
        );
    },
    res(obj) {
        return {
            out: _.get(obj, 'out'),
            time: _.get(obj, 'time'),
        };
    },
};

const disablePaths = paths => {
    if (!paths || paths.length <= 0) {
        return;
    }
    _.forEach(serializers, (value, key) => {
        const matcher = new RegExp(`^${key}.(.*)`);
        const affectedFields = [];
        paths.forEach(field => {
            field.replace(matcher, (match, p1) => {
                affectedFields.push(p1);
            });
        });

        if (affectedFields.length > 0) {
            const newSerializer = obj => {
                return _.omit(value(obj), affectedFields);
            };
            serializers[key] = newSerializer;
        }
    });
};

const enablePaths = paths => {
    if (!paths || paths.length <= 0) {
        return;
    }
    _.forEach(serializers, (value, key) => {
        const matcher = new RegExp(`^${key}.(.*)`);
        const affectedFields = [];
        paths.forEach(field => {
            field.replace(matcher, (match, p1) => {
                affectedFields.push(p1);
            });
        });

        if (affectedFields.length > 0) {
            const newSerializer = obj => {
                const newFields = _.pick(obj, affectedFields);
                const originalResult = value(obj);
                return _.assign(originalResult, newFields);
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
