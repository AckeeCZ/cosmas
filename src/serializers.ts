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
        const [body, query] = ['body', 'query'].map((name) => {
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

const sliceByPrefix = (prefix: string, paths?: string[]) =>
    (paths || []).filter((field) => field.startsWith(prefix)).map((field) => field.slice(prefix.length));

const groupPrefixes = (paths: string[] = []): Map<string, string[] | null> => {
    const prefixes = new Map<string, string[] | null>();

    paths.forEach((path) => {
        const [prefix, value] = path.split(/\.(.+)/);
        if (value && prefixes.has(prefix)) {
            const prefixValues = prefixes.get(prefix);
            if (prefixValues) prefixValues.push(value);
        } else {
            prefixes.set(prefix, value ? [value] : null);
        }
    });
    return prefixes;
};

const disablePaths = (paths?: string[]) => {
    const notDisabled = new Map<string, boolean>(paths?.map((path) => [path, true]) || []);

    forEach(serializers, (value, key) => {
        const affectedFields = sliceByPrefix(`${key}.`, paths);

        if (affectedFields.length === 0) return;
        affectedFields.forEach((path) => notDisabled.delete(`${key}.${path}`));

        const newSerializer: SerializerFn = (obj: Dictionary<any>) => {
            return omit(value(obj), affectedFields);
        };
        serializers[key] = newSerializer;
    });

    if (!notDisabled.size) return;

    const prefixGroups = groupPrefixes(Array.from(notDisabled.keys()));

    prefixGroups.forEach((fields, prefix) => {
        serializers[prefix] = (obj: Dictionary<any>) => {
            return fields === null ? {} : omit(obj, fields);
        };
    });
};

const enablePaths = (paths?: string[]) => {
    forEach(serializers, (value, key) => {
        if (paths && paths.includes(key)) {
            delete serializers[key];
            return;
        }
        const affectedFields = sliceByPrefix(`${key}.`, paths);

        if (affectedFields.length === 0) return;
        const newSerializer: SerializerFn = (obj: Dictionary<any>) => {
            const newFields = pick(obj, affectedFields);
            const originalResult = value(obj);
            return Object.assign({}, originalResult, newFields);
        };
        serializers[key] = newSerializer;
    });
};

export { disablePaths, enablePaths, serializers };
