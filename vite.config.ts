import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    // Relative asset URLs, so `dist/` also works from a sub-folder (e.g. under XAMPP).
    base: './',
    plugins: [tailwindcss()],
    server: {
        port: 5173,
    },
    test: {
        include: ['tests/**/*.test.ts'],
        environment: 'node',
    },
});
