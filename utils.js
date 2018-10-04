const pick = (object, paths) => {
    const obj = {};
    for (const path of paths) {
        if (object[path]) {
            obj[path] = object[path];
        }
    }
    return obj;
};

module.exports = { pick };
