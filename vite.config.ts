/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: './src/index.ts',
            fileName: (format, entryName) => `${entryName}.${format === 'cjs' ? 'cjs' : 'mjs'}`,
            formats: ['cjs', 'es'],
        },
        // library code should not be minified according to this article
        // https://stackoverflow.com/a/48673965/15090924
        minify: false,
    },
    test: {
        environment: 'jsdom',
        include: ['**/*.{test,vitest}.{ts,tsx}'],
        coverage: {
            reporter: ['text', 'lcov'],
            include: ['src/**/*.ts'],
            thresholds: { lines: 99, branches: 98, functions: 100, statements: 99 },
        },
    },
});
