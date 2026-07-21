/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testMatch: ["**/__tests__/**/*.test.ts"],
  setupFiles: ["<rootDir>/test-utils/env.ts"],
  clearMocks: true,
  // better-sqlite3 is a native module; each test file gets its own DB + fresh require cache
  // (Jest's default), so tests never share state or leak connections across files.
  maxWorkers: "50%",
  transform: {
    "^.+\\.ts$": ["ts-jest", {}],
  },
  moduleNameMapper: {
    "^uuid$": "<rootDir>/test-utils/uuidMock.js",
  },
};
