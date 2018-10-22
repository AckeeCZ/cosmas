import { Dictionary } from 'lodash';
import isEmpty = require('lodash.isempty');
import omit = require('omit-deep');

const removeEmpty = (obj: Dictionary<any>): object =>
    omit(obj, Object.keys(obj).filter(key => obj[key] === undefined || isEmpty(obj[key])));

export { removeEmpty };
