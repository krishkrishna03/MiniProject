import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: [
      'pdfjs-dist/legacy/build/pdf',
      'pdfjs-dist/legacy/build/pdf.worker'
    ]
  }
});
