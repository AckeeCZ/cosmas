import { Request } from 'express';
import { Dictionary } from 'lodash';
import isEmptyObject = require('lodash.isempty');
import omit = require('omit-deep');

const isPrimitive = (val: any) => val !== Object(val);

const isEmpty = (val: any) => {
    if (isPrimitive(val)) {
        return val === null || val === undefined || val === '';
    }
    return isEmptyObject(val);
};

const removeEmpty = (obj: Dictionary<any>): object =>
    omit(
        obj,
        Object.keys(obj).filter((key) => obj[key] === undefined || isEmpty(obj[key]))
    );

const matchPath =
    (pattern: RegExp) =>
    (req: Request): boolean =>
        req.originalUrl.match(pattern) !== null;

export { removeEmpty, matchPath };
