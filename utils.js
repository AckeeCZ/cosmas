const isEmpty = require('lodash.isempty');
const difference = require('lodash.difference');
const pick = require('lodash.pick');

// left here for future
/* const shallowOmit = (obj, omitKeys) => {
    return difference(Object.keys(obj), omitKeys).reduce((omitted, key) => {
        omitted[key] = obj[key];
        return omitted;
    }, {});
};*/

const shallowOmit = (obj, omitKeys) => pick(obj, difference(Object.keys(obj), omitKeys));

const removeEmpty = obj =>
    shallowOmit(obj, Object.keys(obj).filter(key => obj[key] === undefined || isEmpty(obj[key])));

module.exports = { shallowOmit, removeEmpty };
