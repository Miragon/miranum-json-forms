import {createVuePlugin} from "vite-plugin-vue2";
import {defineConfig} from 'vite'
import path from 'path';
import {viteStaticCopy} from 'vite-plugin-static-copy'
import Components from 'unplugin-vue-components/vite'
import {VuetifyResolver} from "unplugin-vue-components/resolvers";

export default defineConfig({
    resolve: {
        alias: [
            {
                find: '@/',
                replacement: `${path.resolve(__dirname, './web')}/`,
            },
        ],
    },
    plugins: [
        createVuePlugin(),
        Components({
            transformer: 'vue2',
            dts: true,
            resolvers: [
                VuetifyResolver()
            ]
        }),
        viteStaticCopy({
            targets: [
                {src: 'node_modules/@mdi/font/css/**', dest: 'assets/css/'},
                {src: 'node_modules/@mdi/font/fonts/**', dest: 'assets/fonts/'}
            ]
        })
    ],
    build: {
        target: 'es2021',
        commonjsOptions: {transformMixedEsModules: true},
        lib: {
            entry: 'src/web/main.ts',
            name: 'test',
            fileName: 'client',
        },
        outDir: 'dist/client',
        rollupOptions: {},
        minify: 'esbuild',
    },
    define: {
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    }
})

