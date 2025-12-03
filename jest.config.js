module.exports = {
    testEnvironment: "jest-environment-jsdom",
    preset: "ts-jest/presets/default-esm",
    globals: {
        "ts-jest": {
            tsConfig: "tsconfig.json",
            useESM: true,
        },
    },

    transform: {
        "^.+\\.(js|jsx)$": "babel-jest",
        "^.+\\.(ts|tsx)$": "ts-jest",
    },
    transformIgnorePatterns: ["/node_modules/kintone-ui-component.+\\.ts"],
};
