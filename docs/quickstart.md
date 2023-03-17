# VS Code BPMN Modeler

### Project structure
```
.
├── examples
├── package.json
├── tsconfig.json
├── resources
│   └── css
│       └── reset.css
└── src
    ├── extension.ts
    ├── JsonFormsBuilder.ts
    ├── lib
    ├── shared      // between 'backend' and 'frontend' (= webview)
    ├── utils
    ├── controller
    ├── components
    └── web
        ├── postcss.config.js
        ├── tsconfig.json
        ├── vite.config.js
        └── app
            ├── mant.ts
            ├── App.vue
            ├── components
            ├── composables
            └── css
```

### Quickstart
```shell
git clone https://github.com/FlowSquad/miranum-json-forms.git
cd miranum-json-forms
```
```shell
npm install
npm run build
```
```shell
code .
```
Open `Extension Host` with `F5` and open the example folder.

### Development
The `web` folder contains the necessary files for building the webapp we use for the webview.  
So it is possible to develop the webview detached from the extension.  
For bundling the webview we use `vite`.  
**During development use `npm run web-dev` for HMR.**


> **_NOTE:_** You may have to try to build the webview multiple times because Tailwind gives an error message that a 
> css class is missing.
