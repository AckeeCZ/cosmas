# Cosmas

<div align="center">

![Cosmas](https://i.imgur.com/EFe3wOa.png)

[![Build Status](https://img.shields.io/travis/com/AckeeCZ/cosmas/master.svg?style=flat-square)](https://travis-ci.com/AckeeCZ/cosmas)
[![Node Version](https://img.shields.io/node/v/cosmas?style=flat-square)](https://www.npmjs.com/package/cosmas)
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

</div>

## How to use

### Import the logger factory

```js
const loggerFactory = require('cosmas').default;
```

or with import

```js
import loggerFactory from 'cosmas';
```

### Create logger with default configuration

```js
const logger = loggerFactory; // factory itself is a logger
// or
const logger = loggerFactory();
```

### Create logger with custom configuration

```js
const logger = loggerFactory({
    disableFields: ['error.stack'],
    enableFields: ['req.protocol']
});
```

See **Options** for a list of possible options.

### Child loggers
Every logger can be used to create a *child* logger. Child logger inherits all configuration of its *parent* and cannot override them.

Child logger can specify its own *name* which is then concatenated with parent's *name*. Therefore the child logger name is `parentNamechildName`.

```js
const parentLogger = loggerFactory('database', { pretty: false });
const childLogger = parentLogger('.updates');
```

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

## Using Sentry

Cosmas logs every message to [Sentry](https://sentry.io/) for you, when configured. This feature is disabled by default.

Sentry SDK `@sentry/node` is a peer dependency. If you want cosmas to use it, install it in your project.

```js
// (1) Let cosmas initialize sentry with provided DSN
const myLogger = logger({ sentry: 'https://<key>@sentry.io/<project>' })

// (2) Configure sentry yourself and let cosmas use it
Sentry.init({/*...*/})
const myLogger = logger({ sentry: true })

// (3) Disable sentry (default, no need to send false option)
const myLogger = logger({ sentry: false })
```

When configured, cosmas (additionally to standard logging) captures all logs via Sentry SDK. Logs containing `stack` are logged as exceptions via `captureException` (preserves stack trace) and all other messages via `captureMessage`.

Either way, scope is appropriately set, as well as all payload is passed on in scope's metadata.

By default, Cosmas only logs to Sentry logs with `warn` or higher level. You can change this behaviour by setting `sentryLevel` option.


## Express middleware

`cosmas` contains an express middleware which you can use to log all requests and responses of your express application.

Usage:
```js
const express = require('express');

const logger = require('cosmas').default;
// or
import logger from 'cosmas';

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

### Request and response skipping
You might want to omit some requests or responses from logging completely. Right now, there are two ways to do it and you can even use both at once.
1) Use `options.ignoredHttpMethods` to define an array of HTTP methods you want to omit. By default all `OPTIONS` requests and responses are ommited. See [options](#options) for details
2) Use `options.skip` method to define custom rules for request/response skipping. Set it to a function which accepts an Express's `Request` and `Response` and returns `boolean`. If the return value is `true`, request (or response) will not be logged. You might want to use `matchPath` helper to ignore requests based on the [`req.originalUrl` value](https://expressjs.com/en/4x/api.html#req.originalUrl)

```js
const { matchPath } = require('cosmas/utils');
const logger = require('cosmas').default({
    skip: matchPath(/heal.h/),
});
```

## Environment-specific behavior
`cosmas` is meant to be used throughout different environments (development, testing, production) and some of its configuration is setup differently based on the environment it runs in. By default, `severity` (contains current log level) and `pkgVersion` (contains current version of `cosmas`) fields are added to logged object.

### Testing
If the `NODE_ENV` environment variable is set to `test`, all logs are turned off (minimal loglevel is set to `silent` which effectively turns logging off).

### Pretty print
If you set `pretty` option to `true`, you enable pretty print mode intended for development use. `cosmas.pkgVersion`, `cosmas.loggerName` and `severity` are ommited from the output.

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
- `skip` - Function to be used in express middlewares for filtering request and response logs. If the function returns `true` for a given request, no message will be logged. No default value.
- `config` - object, which will be passed to underlying logger object. Right now, underlying logger is [pino](https://github.com/pinojs/pino), so for available options see [pino API docs](https://github.com/pinojs/pino/blob/master/docs/API.md#pinooptions-stream)
- `sentry` - `true` to enable without configuring or `<sentry dsn>` to enable and configure with dsn beforehand, `false` to disable (default)
- `sentryLevel` - set minimum level to log to sentry (default `warn`)

## Default serializers
`cosmas` defines some [pino serializers](https://github.com/pinojs/pino/blob/db651a51762e8b043f406a73bb19470bcf6dcff1/docs/api.md#serializers-object) on its own

- `error` - logs `message`, `code`, `stack` and `data` fields
- `processEnv` - logs `NODE_PATH` and `NODE_ENV`
- `req` - logs `body`, `query`, `url`, `method`, `headers.x-deviceid`, `headers.authorization`, `headers.user-agent` and omits `password` and `passwordCheck` from `body` and `query`
- `res` - logs `out`, `time`

## Reserved keys
Cosmas uses some object keys for its own purposes. Those keys should not be used in data you send to log functions as they may be overwritten by Cosmas. Those keys are:

- `cosmas.loggerName` - used for the name of logger
- `cosmas.pkgVersion` - used for the version of `cosmas`
- `message` - used for the log message text

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
