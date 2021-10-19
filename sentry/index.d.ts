import  { extendSentry } from '../dist/sentry'

export default extendSentry

declare module 'cosmas/sentry' {
    export = extendSentry
}
