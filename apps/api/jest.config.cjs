/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: [
    '<rootDir>/src',
    '<rootDir>/test',
    '<rootDir>/../../services',
    '<rootDir>/../../packages/shared',
    '<rootDir>/../../packages/config',
  ],
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@yemesek/auth$': '<rootDir>/../../services/auth/src/index.ts',
    '^@yemesek/restaurants$': '<rootDir>/../../services/restaurants/src/index.ts',
    '^@yemesek/reports$': '<rootDir>/../../services/reports/src/index.ts',
    '^@yemesek/evidence$': '<rootDir>/../../services/evidence/src/index.ts',
    '^@yemesek/moderation$': '<rootDir>/../../services/moderation/src/index.ts',
    '^@yemesek/database$': '<rootDir>/../../packages/database/src/index.ts',
    '^@yemesek/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@yemesek/config$': '<rootDir>/../../packages/config/src/index.ts',
  },
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  globalSetup: '<rootDir>/test/global-setup.ts',
  clearMocks: true,
};
