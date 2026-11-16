import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  base:'/Smart_Task_Manager/',
  plugins: [react()],
})
