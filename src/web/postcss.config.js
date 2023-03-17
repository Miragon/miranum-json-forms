module.exports = {
    plugins: {
        tailwindcss: {
            content: ["./src/web/app/**/*.{vue,js,ts,jsx,tsx}"],
            theme: {
                extend: {},
            },
            variants: {
                extend: {},
            },
            plugins: [],
        },
        autoprefixer: {},
    },
};
