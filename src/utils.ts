import * as isEmpty from 'lodash.isempty';
import * as omit from 'omit-deep';

const removeEmpty = obj => omit(obj, Object.keys(obj).filter(key => obj[key] === undefined || isEmpty(obj[key])));

export { removeEmpty };
