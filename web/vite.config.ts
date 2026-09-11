import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const API_PORT = process.env.API_PORT ?? '3333';
const WEB_PORT = Number(process.env.WEB_PORT ?? 5173);

export default defineConfig({
  plugins: [react()],
  server: {
    port: WEB_PORT,
    // Evita CORS no dia a dia: o front chama /api e o Vite repassa para a API do compose.
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
});
