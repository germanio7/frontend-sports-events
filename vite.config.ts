import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// La API Go no manda CORS: en dev se proxea, en prod servir /api desde el mismo origen.
export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: { proxy: { '/api': process.env.API_URL ?? 'http://localhost:83' } },
    preview: { proxy: { '/api': process.env.API_URL ?? 'http://localhost:83' } },
});
