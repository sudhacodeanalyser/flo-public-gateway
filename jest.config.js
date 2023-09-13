module.exports = {
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  moduleFileExtensions: [
    'js',
    'ts',
  ],
  testMatch: [
    '"**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"',
    '**/test/**/*.test.(ts|js)',
  ],
  testEnvironment: 'node',
  preset: 'ts-jest',
}