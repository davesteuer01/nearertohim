import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Let Vite read the workspace packages' TS sources directly in dev,
    // rather than requiring a separate build step for each package.
    preserveSymlinks: true,
  },
});
