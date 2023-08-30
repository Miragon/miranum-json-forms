let configPath = "./src/web/app";
if (process.env.NODE_ENV === "development") {
    configPath = "./app";
}

module.exports = {
    plugins: {
        tailwindcss: {
            content: [`${configPath}/**/*.{vue,js,ts,jsx,tsx}`],
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
