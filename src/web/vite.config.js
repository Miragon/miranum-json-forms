import {defineConfig} from 'vite'
import path from 'path';
import vue from '@vitejs/plugin-vue'

console.log('path', `${path.resolve(__dirname, './web')}/`);

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
            transformMixedEsModules: true,
        },
        lib: {
            entry: 'src/web/app/main.ts',
            name: 'webview',
            fileName: 'webview',
        },
        outDir: 'dist/client',
        rollupOptions: {
            external: [
                'node_modules/@jsonforms/examples/src/examples/i18n.ts'
            ],
        },
        minify: 'esbuild',
    },
    define: {
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    },
    css: {
        postcss: 'src/web/'
    }
})

