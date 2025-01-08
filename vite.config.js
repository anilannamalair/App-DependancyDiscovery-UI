export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // Allow access from external network
    port: 5173,        // Ensure the correct port is used
  },
})

