const colors = require("tailwindcss/colors");
let configPath = "./src/web/app";
if (process.env.NODE_ENV === "development") {
    configPath = "./app";
}

module.exports = {
    plugins: {
        tailwindcss: {
            content: [`${configPath}/**/*.{vue,js,ts,jsx,tsx}`],
            theme: {
                colors: {
                    transparent: "transparent",
                    current: "currentColor",
                    black: colors.black,
                    white: colors.white,
                    gray: colors.gray,

                    red: colors.red,
                    green: colors.green,
                    yellow: colors.yellow,
                    blue: colors.blue,

                    "base-100": "var(--base-100)",
                    "base-200": "var(--base-200)",
                    "base-300": "var(--base-300)",
                    primary: "var(--primary)",
                },
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
