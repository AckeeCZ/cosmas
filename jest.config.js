module.exports = {
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$',
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    collectCoverage: true,
    // testURL because of problems with jsdom https://github.com/jsdom/jsdom/issues/2304
    testURL: "http://localhost",
    setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
};
