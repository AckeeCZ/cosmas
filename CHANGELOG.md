## [Unpublished]

### Added
- change Sentry scope per message

### Changed
- initializing Sentry support in logger

## [2.0.0] - 2020-06-22

### Fixed
- child logger type

### Added
- parent logger name inheritance
- logging to sentry (option `sentry` and `sentryLevel`)
- log time

### Changed
- `pino.pretty` replaced with `util.inspect`
- rename interfaces
- removed user agent and response time from express middleware logs

## [1.1.0] - 2019-08-05

### Fixed
- lint issue due to changes in tslint 5.12.0
- stream write function type
- pretty streams created only when needed
- logger name in pretty loggers
- empty user-agent logged no more
- set cosmas's default level for custom streams missing level spec


### Added
- coveralls integration
- automatic logger name in non-pretty loggers
- `options.skip` settings for custom log filtering in Express
  
### Changed
- refactoring of express handlers
- `severity` and `pkgVersion` fields hidden in pretty output
- log levels for express middleware

## [1.0.3] - 2018-11-08

### Fixed
- bug in pretty print
- update README

## [1.0.2] - 2018-11-08

### Added
- .npmignore
- `prepublishOnly` npm script
- Travis CI build

## [1.0.1] - 2018-11-02

### Changed
- renamed to `cosmas`
- moved to public GitHub repo

## [1.0.0] - 2018-10-17

### Changed
- converted to Typescript

## [0.2.9] - 2018-10-15

### Changed
- output format of express middleware logging

### Fixed
- bug in `enableFields` options

## [0.2.7] - 2018-10-10

### Changed
- replace rest operator with `omit-deep` package

## [0.2.6] - 2018-10-04

### Added
- log version of `ackee-node-logger` package being used to `pkgVersion` field

### Changed
- change default serializer for `process` object
- do not log undefined and empty objects in default serializers
- remove some lodash packages

## [0.2.5] - 2018-09-10

### Added
- log object are automatically enhanced for Google Stackdriver
- `options.disableStackdriverFormat` to prevent logger from modifying log objects

## [0.2.4] - 2018-09-06

### Added
- `options.ignoredHttpMethods` to ignore certain HTTP requests in express middleware

## [0.2.3] - 2018-09-06

### Fixed
- log levels not working correctly

## [0.2.1] - 2018-06-08

### Added

- `options.config` for configuring underlying logger instance
- "Tips" section to README


## [0.1.1] - 2018-05-29

### Added
- `options.pretty` option to activate pretty streams

### Changed
- Default streams are no pretty anymore
