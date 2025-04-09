module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.e2e.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  setupFiles: ['dotenv/config'],
  moduleNameMapper: {
    'ˆ@functions/(.*)': '<rootDir>/stateless/functions/$1',
  }
};
