const { Transform } = require('stream');
const pkgJson = require('./package.json');

class DefaultTransformStream extends Transform {
    _transform(chunk, encoding, callback) {
        const obj = JSON.parse(chunk);
        obj.pkgVersion = pkgJson.version;

        this.push(`${JSON.stringify(obj)}\n`);
        callback();
    }
}

const decorateStreams = (streams, StreamClass) => {
    return streams.map(stream => {
        const newStream = new StreamClass();
        newStream.pipe(stream.stream);
        return {
            level: stream.level,
            maxLevel: stream.maxLevel,
            stream: newStream,
        };
    });
};

module.exports = { decorateStreams, DefaultTransformStream };
