import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      enabled: true,
      reporter: ['text', 'lcov'],
      lines: 0.95,
      functions: 0.95,
      branches: 0.9,
      statements: 0.95,
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    globals: true,
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    reporters: ['default'],
  },
});
