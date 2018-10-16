import * as forEach from 'lodash.foreach';
import * as omit from 'omit-deep';
import * as pick from 'pick-deep';
import { removeEmpty } from './utils';

const serializers = {
    error(obj) {
        return {
            code: obj.code,
            data: obj.data,
            message: obj.message,
            stack: obj.stack,
        };
    },
    process(obj) {
        if (!obj.env) {
            return obj;
        }
        const nodePath = obj.env.NODE_PATH;
        const nodeEnv = obj.env.NODE_ENV;
        const filteredEnv = { env: removeEmpty({ nodePath, nodeEnv }) };
        const rest = Object.assign({}, obj);
        omit(rest, 'env');
        return removeEmpty(Object.assign({}, filteredEnv, rest));
    },
    req(obj) {
        const pickHeaders = ['x-deviceid', 'authorization', 'user-agent'];
        const [body, query] = ['body', 'query'].map(name => {
            const source = obj[name];
            if (source) {
                const rest = Object.assign({}, source);
                omit(rest, ['password', 'passwordCheck']);
                return rest;
            }
            return source;
        });

        return removeEmpty({
            body,
            query,
            headers: pick(obj.headers, pickHeaders),
            method: obj.method,
            url: obj.originalUrl || obj.url,
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

export { disablePaths, enablePaths, serializers };
