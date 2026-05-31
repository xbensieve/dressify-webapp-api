import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['src/tests/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // Empty spec file — swagger docs, not a test file
      'src/shared/docs/swagger.spec.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/tests/**', 'src/**/*.d.ts', 'src/server.ts', 'src/shared/docs/**'],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    testTimeout: 60000,   // 60s for streaming tests
    hookTimeout: 60000,
  },
  resolve: {
    alias: {
      '@modules': resolve(__dirname, 'src/modules'),
      '@infrastructure': resolve(__dirname, 'src/infrastructure'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@workers': resolve(__dirname, 'src/workers'),
      '@tests': resolve(__dirname, 'src/tests'),
    },
  },
});
