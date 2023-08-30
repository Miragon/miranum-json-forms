import { defineConfig } from "vite";
import path from "path";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ command }) => {
    let root = "";
    if (command === "build") {
        root = "src/web";
    }
    return {
        resolve: {
            alias: [
                {
                    find: "@",
                    replacement: path.resolve(__dirname, "./app"),
                },
            ],
        },
        plugins: [
            vue({
                template: {
                    compilerOptions: {
                        // treat all tags with a dash as custom elements
                        isCustomElement: (tag) => tag.includes("-"),
                    },
                },
            }),
        ],
        build: {
            target: "es2021",
            commonjsOptions: {
                transformMixedEsModules: true,
            },
            outDir: "dist/client",
            rollupOptions: {
                input: `${root}/app/main.ts`,
                output: {
                    // don't hash the name of the output file (index.js)
                    entryFileNames: `[name].js`,
                    assetFileNames: `[name].[ext]`,
                },
            },
        },
        define: {
            "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
        },
        css: {
            postcss: "src/web",
        },
    };
});
