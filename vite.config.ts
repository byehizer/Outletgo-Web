import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  esbuild: {
    drop: command === 'build' ? ['console', 'debugger'] : [],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }

          if (
            id.includes('react-dom') ||
            id.includes('react-router') ||
            id.includes('/react/') ||
            id.includes('\\react\\')
          ) {
            return 'react-vendor';
          }

          if (id.includes('lucide-react')) {
            return 'lucide-vendor';
          }

          if (id.includes('date-fns')) {
            return 'date-fns-vendor';
          }

          if (
            id.includes('react-hook-form') ||
            id.includes('@hookform') ||
            id.includes('/zod/') ||
            id.includes('\\zod\\')
          ) {
            return 'forms-vendor';
          }

          return 'misc-vendor';
        },
      },
    },
  },
}));
