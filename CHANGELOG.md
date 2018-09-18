### Added
- log version of `ackee-node-logger` package being used to `pkgVersion` field

### Changed
- change default serializer for `process` object
- do not log undefined and empty objects in default serializers

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
