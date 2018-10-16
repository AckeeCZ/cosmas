// Tests are in `src` folder because otherwise, the declaration below does not load correclty

declare namespace jest {
    export interface Expect {
        <T = any>(actual: T, message?: string): Matchers<T>;
    }
}
