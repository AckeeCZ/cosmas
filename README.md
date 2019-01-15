# Cosmas

[![Build Status](https://img.shields.io/travis/com/AckeeCZ/cosmas/master.svg?style=flat-square)](https://travis-ci.com/AckeeCZ/cosmas)
[![Npm](https://img.shields.io/npm/v/cosmas.svg?style=flat-square)](https://www.npmjs.com/package/cosmas)
[![License](https://img.shields.io/github/license/AckeeCZ/cosmas.svg?style=flat-square)](https://github.com/AckeeCZ/cosmas/blob/master/LICENSE)
[![Coverage Status](https://img.shields.io/coveralls/github/AckeeCZ/cosmas.svg?style=flat-square)](https://coveralls.io/github/AckeeCZ/cosmas?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/github/AckeeCZ/cosmas/badge.svg?targetFile=package.json)](https://snyk.io/test/github/AckeeCZ/cosmas?targetFile=package.json)
[![Dependencies](https://img.shields.io/david/AckeeCZ/cosmas.svg?style=flat-square)](https://david-dm.org/AckeeCZ/cosmas)	
[![Dev dependencies](https://img.shields.io/david/dev/AckeeCZ/cosmas.svg?style=flat-square)](https://david-dm.org/AckeeCZ/cosmas)
[![Maintainability](https://img.shields.io/codeclimate/maintainability/AckeeCZ/cosmas.svg?style=flat-square)](https://codeclimate.com/github/AckeeCZ/cosmas)
[![Downloads](https://img.shields.io/npm/dw/cosmas.svg?style=flat-square)](https://www.npmjs.com/package/cosmas)
[![Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

Simple pino-based logger for all your writing needs

## How to use

First step is to create a root logger. Its configuration can be specified on creation and it will be used for all other loggers created.

### Import the logger factory

```js
const loggerFactory = require('cosmas').default;
```

or with import

```js
import loggerFactory from 'cosmas';
```

### Create root logger with default configuration

```js
const logger = loggerFactory; // factory itself is a logger
// or
const logger = loggerFactory();
```

### Create root logger with custom configuration

```js
const logger = loggerFactory({
    disableFields: ['error.stack'],
    enableFields: ['req.protocol']
});
```

Note: If you want to specify custom configuration it must be done **in the first require** of `cosmas`. Otherwise, default configuration will be used.

See **Options** for a list of possible options.

After you create a root logger, you may use it or you can create a child logger.

```js
const databaseLogger = loggerFactory('database')
```

The only difference between root logger and a child logger is that the child logger will print its name in each log message.

## Logger usage

Logger itself is an enhanced and specifically configured `pino` instance, so you may use all basic `pino` log methods

```js
logger.info('hello world')
logger.error('this is at error level')
logger.info('the answer is %d', 42)
logger.info({ obj: 42 }, 'hello world')
logger.info({ obj: 42, b: 2 }, 'hello world')
logger.info({ obj: { aa: 'bbb' } }, 'another')
```

All `pino` levels are supported and additionaly there is a `warning` level which is equivalent to `warn` level.

Default minimal log level is `debug`.

All loglevels up to warning (exclusive) - trace, debug and info - are logged to `stdout` **only**.

All loglevels from warning up (inclusive) - warning, error, fatal - are logged to `stderr` **only**.

## Express middleware

`cosmas` contains an express middleware which you can use to log all requests and responses of your express application.

Usage:
```js
const express = require('express');
const logger = require('cosmas');

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

All those log messages will contain request and possibly response, error, time from request to response, status code and `user-agent`, `x-deviceid` and `authorization` request headers.

## Environment-specific behavior
`cosmas` is meant to be used throughout different environments (development, testing, production) and some of its configuration is setup differently based on the environment it runs in.

### Testing
If the `NODE_ENV` environment variable is set to `test`, all logs are turned off (minimal loglevel is set to `silent` which effectively turns logging off).

### Otherwise
[Standard pino log](https://github.com/pinojs/pino#usage) is used and it's optimized for Google Stackdriver logging. That means that default log level is `debug`, pretty print is turned off and [pino's `messageKey` option](https://github.com/pinojs/pino/blob/master/docs/API.md#pinooptions-stream) is set to `message`.

## Options
Options override both default logger configuration and environment-specific configuration. However, do not forget to specify it during the **first** `cosmas`. During it, root logger is created and it cannot be changed later.

- `defaultLevel` - set logger's minimal loglevel (default is `debug`)
- `disableFields` - list of paths which will be omitted from the objects being logged (if any)
- `enableFields` - list of paths which will not be omitted by default serializers from objects being logged
- `ignoredHttpMethods` - list of HTTP methods which will not be logged by express logging middleware at all. Defaults to `['OPTIONS']`
- `streams` - list of stream objects, which will be passed directly to [pino-multistream's multistream function](https://github.com/pinojs/pino-multi-stream#pinomsmultistreamstreams) instead of default `cosmas` stream
- `pretty` - if set to `true`, logger will use [pino pretty human-readable logs](https://github.com/pinojs/pino/blob/master/docs/API.md#pretty). This option can be overriden by `streams`
- `disableStackdriverFormat` - if set to `false`, logger will add `severity` field to all log objects, so that log levels in Google Stackdriver work as expected. Defaults to `false`
- `config` - object, which will be passed to underlying logger object. Right now, underlying logger is [pino](https://github.com/pinojs/pino), so for available options see [pino API docs](https://github.com/pinojs/pino/blob/master/docs/API.md#pinooptions-stream)

## Default serializers
`cosmas` defines some [pino serializers](https://github.com/pinojs/pino/blob/master/docs/API.md#constructor) on its own

- `error` - logs `message`, `code`, `stack` and `data` fields
- `processEnv` - logs `NODE_PATH` and `NODE_ENV`
- `req` - logs `body`, `query`, `url`, `method` and omits `password` and `passwordCheck` from `body` and `query`
- `res` - logs `out` and `time`


## Tips

### VS Code debugging not showing log messages

This problem is caused by a way VS Code handles console output. Therefore it appears in Winston and pino (underlying library of cosmas) as well.

However, it can be easily solved by adding eithe

```js
"console": "integratedTerminal",
```

or

```js
"outputCapture": "std"
```

to the debug configuration in your `launch.json` file.
