
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // This allows process.env.API_KEY to work in the browser,
    // pulling from your Vercel/System environment variables.
    'process.env': process.env
  }
});
