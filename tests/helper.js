const split = require('split2');
const writer = require('flush-write-stream');

function redirect(func) {
    const result = split(JSON.parse);
    result.pipe(writer.obj(func));
    return result;
}

exports.redirect = redirect;
