import { Request } from 'express';
import { Dictionary } from 'lodash';
import isEmpty = require('lodash.isempty');
import omit = require('omit-deep');

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
