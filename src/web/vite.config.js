import {defineConfig} from 'vite'
import path from 'path';
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    resolve: {
        alias: [
            {
                find: '@',
                replacement: path.resolve(__dirname, './app'),
            },
        ],
    },
    plugins: [
        vue()
    ],
    build: {
        target: 'es2021',
        commonjsOptions: {
            transformMixedEsModules: true
        },
        lib: {
            entry: 'src/web/app/main.ts',
            name: 'webview',
            fileName: 'webview',
        },
        outDir: 'dist/client',
        rollupOptions: {},
        minify: 'esbuild',
    },
    define: {
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    },
    css: {
        postcss: 'src/web/'
    }
})

