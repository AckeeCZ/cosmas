import * as fs from 'fs';
import * as path from 'path';
import { Transform } from 'stream';

const pkgJson = JSON.parse(fs.readFileSync(path.resolve(path.join(__dirname, '..', 'package.json')), 'utf8'));

class DefaultTransformStream extends Transform {
    public _transform(chunk, encoding, callback) {
        const obj = JSON.parse(chunk);
        obj.pkgVersion = pkgJson.version;

        this.push(`${JSON.stringify(obj)}\n`);
        callback();
    }
}

const decorateStreams = (streams, streamClass) => {
    return streams.map(stream => {
        const newStream = new streamClass();
        newStream.pipe(stream.stream);
        return {
            level: stream.level,
            maxLevel: stream.maxLevel,
            stream: newStream,
        };
    });
};

export { decorateStreams, DefaultTransformStream };
