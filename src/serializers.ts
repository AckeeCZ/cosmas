import { Dictionary } from 'lodash';
import forEach = require('lodash.foreach');
import omit = require('omit-deep');
import pick = require('pick-deep');
import { removeEmpty } from './utils';

type SerializerFn = (obj: Dictionary<any>) => Dictionary<any>;

const serializers: Dictionary<SerializerFn> = {
    error(obj: Dictionary<any>): Dictionary<any> {
        return {
            code: obj.code,
            data: obj.data,
            message: obj.message,
            stack: obj.stack,
        };
    },
    process(obj: Dictionary<any>): Dictionary<any> {
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
    req(obj: Dictionary<any>): Dictionary<any> {
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
    res(obj: Dictionary<any>): Dictionary<any> {
        return {
            out: obj.out,
            time: obj.time,
        };
    },
};

const disablePaths = (paths: string[] | undefined) => {
    if (!paths || paths.length <= 0) {
        return;
    }
    forEach(serializers, (value, key) => {
        const matcher = new RegExp(`^${key}.(.*)`);
        const affectedFields: string[] = [];
        paths.forEach(field => {
            const res = field.match(matcher);
            if (res !== null) {
                affectedFields.push(res[1]);
            }
        });

        if (affectedFields.length > 0) {
            const newSerializer: SerializerFn = (obj: Dictionary<any>) => {
                return omit(value(obj), affectedFields);
            };
            serializers[key] = newSerializer;
        }
    });
};

const enablePaths = (paths: string[] | undefined) => {
    if (!paths || paths.length <= 0) {
        return;
    }
    forEach(serializers, (value, key) => {
        const matcher = new RegExp(`^${key}.(.*)`);
        const affectedFields: string[] = [];
        paths.forEach(field => {
            const res = field.match(matcher);
            if (res !== null) {
                affectedFields.push(res[1]);
            }
        });

        if (affectedFields.length > 0) {
            const newSerializer: SerializerFn = (obj: Dictionary<any>) => {
                const newFields = pick(obj, affectedFields);
                const originalResult = value(obj);
                return Object.assign({}, originalResult, newFields);
            };
            serializers[key] = newSerializer;
        }
    });
};

export { disablePaths, enablePaths, serializers };
