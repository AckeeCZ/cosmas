# Simple pino-based logger setup for Ackee purposes

## How to use

First step is to create a root logger. Its configuration can be specified on creation and it will be used for all other loggers created.

### Create root logger with default configuration

```js
const logger = require('ackee-node-logger');
// of
const logger = require('ackee-node-logger')();
```

### Create root logger with custom configuration

```js
const logger = require('ackee-node-logger)({
    disableFields: ['error.stack'],
    enableFields: ['req.protocol']
});
```

Note: If you want to specify custom configuration it must be done **in the first require** of `ackee-node-logger`. Otherwise, default configuration will be used.

See **Options** for a list of possible options.

After you create a root logger, you may use it or you can create a child logger.

```js
const databaseLogger = require('ackee-node-logger')('database')
```

The only difference between root logger and a child logger is that the child logger will print its name in each log message.

## Logger usage

Logger itself is an enhanced and specifically configured `pino` instance, so you may use all basic `pino` log methods

```js
pino.info('hello world')
pino.error('this is at error level')
pino.info('the answer is %d', 42)
pino.info({ obj: 42 }, 'hello world')
pino.info({ obj: 42, b: 2 }, 'hello world')
pino.info({ obj: { aa: 'bbb' } }, 'another')
```

All `pino` levels are supported and additionaly there is a `warning` level which is equivalent to `warn` level.

Default minimal log level is `debug`.

All loglevels up to warning (exclusive) - trace, debug and info - are logged to `stdout` **only**.

All loglevels from warning up (inclusive) - warning, error, fatal - are logged to `stderr` **only**.

## Express middleware

`ackee-node-logger` contains an express middleware which you can use to log all requests and responses of your express application.

Usage:
```js
const express = require('express');
const logger = require('ackee-node-logger');

const app = express();
// or
const router = express.Router();

app.use(logger.express)
// or
router.use(logger.express)
```

By default, it will log all incoming requests in `debug` level, all outcoming responses with `out` property in `debug` level and all outcoming responses without `out` property on `info` level.

If you use it together with logger's error express middleware, it will also log all errors in `error` level.

```js
app.use(logger.expressError)
```

All those log messages will contain request and possibly response, error, time from request to response and status code.

## Environment-specific behavior
`ackee-node-logger` is meant to be used throughout different environments (development, testing, production) and some of its configuration is setup differently based on the environment it runs in.

### Testing
If the `NODE_ENV` environment variable is set to `test`, all logs are turned off (minimal loglevel is set to `silent` which effectively turns logging off).

### Production
If the `NODE_ENV` environment variable is set to `production`, [standard pino log](https://github.com/pinojs/pino#usage) is used.

### Otherwise
In other cases, minimal loglevel is set to `debug` and [pino pretty human-readable logs](https://github.com/pinojs/pino/blob/master/docs/API.md#pretty) are used.

## Options
Options override both default logger configuration and environment-specific configuration. However, do not forget to specify it during the **first** `ackee-node-logger`. During it, root logger is created and it cannot be changed later.

- `defaultLevel` - set logger's minimal loglevel (default is `debug`)
- `disableFields` - list of paths which will be omitted from the objects being logged (if any)
- `enableFields` - list of paths which will not be omitted by default serializers from objects being logged
- `streams` - list of stream objects, which will be passed directly to [pino-multistream's multistream function](https://github.com/pinojs/pino-multi-stream#pinomsmultistreamstreams) instead of default `ackee-node-logger` stream
- `pretty` - if set to `true`, logger will use pretty print. This option can be overriden by `streams`
- `pino` - object, which will be passed to underlying pino logger. See available settings in [pino API docs](https://github.com/pinojs/pino/blob/master/docs/API.md#pinooptions-stream)

## Default serializers
`ackee-node-logger` defines some [pino serializers](https://github.com/pinojs/pino/blob/master/docs/API.md#constructor) on its own

- `error` - logs `message`, `code`, `stack` and `data` fields
- `processEnv` - logs `NODE_PATH` and `NODE_ENV`
- `req` - logs `body`, `query`, `url`, `method` and omits `password` and `passwordCheck` from `body` and `query`
- `res` - logs `out` and `time`


## Tips

### Nice Google Cloud Stackdriver messages

If you examine log messages in Google's [Stackdriver](https://cloud.google.com/stackdriver/) you probably noticed that most of the time, the whole message payload is displayed as a "title" of the message.

This is because Stackdriver takes the title from `message` field (if available). But pino (ackee-node-logger underlying library) logs those titles to `msg` field (by default).

This can be changed by passing pino the `messageKey` option. It will hide the pretty print message title, but you will have nicer Stackdriver messages

```js
const logger = require('ackee-node-logger')({ pino: { messageKey: 'message'} });
```

### VS Code debugging not showing log messages

This problem is caused by a way VS Code handles console output. Therefore it appears in Winston and pino (underlying library of ackee-node-logger) as well.

However, it can be easily solved by adding eithe

```js
"console": "integratedTerminal",
```

or

```js
"outputCapture": "std"
```

to the debug configuration in your `launch.json` file.
