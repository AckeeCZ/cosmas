declare module 'omit-deep' {
    function omitDeep(value: object | object[], keys: string | string[]): object;
    export = omitDeep;
}

declare module 'pick-deep' {
    function pickDeep(obj: object, paths: string | string[], separator?: string): object;
    export = pickDeep;
}
