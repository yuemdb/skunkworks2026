import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathPattern: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
};

export default createJestConfig(config);
