const isEmpty = require('lodash.isempty');
const omit = require('omit-deep');

const removeEmpty = obj => omit(obj, Object.keys(obj).filter(key => obj[key] === undefined || isEmpty(obj[key])));

module.exports = { removeEmpty };
