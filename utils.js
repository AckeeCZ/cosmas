const isEmpty = require('lodash.isempty');

const pick = (object, paths) => {
    const obj = {};
    for (const path of paths) {
        if (object[path]) {
            obj[path] = object[path];
        }
    }
    return obj;
};

const removeEmpty = obj => {
    Object.keys(obj).forEach(key => {
        if (obj[key] === undefined || isEmpty(obj[key])) {
            delete obj[key];
        }
    });
    return obj;
};

const deleteKeys = (obj, keys) => {
    keys.forEach(key => {
        if (obj[key]) {
            delete obj[key];
        }
    });
    return obj;
};

module.exports = { pick, removeEmpty, deleteKeys };
