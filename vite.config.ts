import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const FULL_COVERAGE = 100

// Piso global vigente (redondeado hacia abajo). Solo sube a medida que se migra a TS.
const GLOBAL_COVERAGE_FLOOR = {
  lines: 58,
  branches: 75,
  functions: 64,
  statements: 58,
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        'src/main.jsx', // arranque de React: solo monta <App />
        'src/test/**',
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/shared/api/database.types.ts', // generado por supabase gen types
      ],
      thresholds: {
        ...GLOBAL_COVERAGE_FLOOR,
        'src/shared/domain/**': {
          lines: FULL_COVERAGE,
          branches: FULL_COVERAGE,
          functions: FULL_COVERAGE,
          statements: FULL_COVERAGE,
        },
      },
    },
  },
})
