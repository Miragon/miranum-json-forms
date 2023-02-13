module.exports = {
  plugins: {
    tailwindcss: {
      content: [
        "./app/**/*.{vue,js,ts,jsx,tsx}",
      ],
      theme: {
        extend: {},
      }
    },
    autoprefixer: {},
  },
}
