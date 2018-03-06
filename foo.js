const loggerFactory = require('.');

const logger = loggerFactory();
const appLogger = loggerFactory('myApp');

logger.info('foobar');
logger.error('error');

logger.fatal(new Error('fatal'));
logger.error(new Error('boom'));
logger.warn('huh %o', { ghost: 'rider' });
logger.info('%s world', 'hello');
logger.debug({ object: 1 });

appLogger.trace('foobar');
appLogger.debug('error');
appLogger.info('error');
appLogger.warning('error');
appLogger.error('error');
appLogger.fatal('error');
