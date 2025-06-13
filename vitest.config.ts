import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    
    // Threading option removed as it is not supported in InlineConfig
    
    include: [
      'test/**/*.test.ts',
      'test/**/*.spec.ts'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**'
    ],
    
    watch: false,
    passWithNoTests: true,
    reporters: ['verbose']
  }
})