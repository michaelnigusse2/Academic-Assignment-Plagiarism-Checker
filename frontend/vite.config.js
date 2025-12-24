import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        port: 5173
    },
    define: {
        // Expose environment variable to the app at build time
        'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
            process.env.VITE_API_BASE_URL || 'http://localhost:8000'
        )
    }
})
