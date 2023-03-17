import { createApp } from "vue";
import App from "./App.vue";
import { provideVSCodeDesignSystem, vsCodeCheckbox, vsCodeTextArea } from "@vscode/webview-ui-toolkit";

import "./css/style.css";
import "./css/form.stylea.css";
import "@backoffice-plus/formbuilder/style.css";

provideVSCodeDesignSystem().register(vsCodeCheckbox(), vsCodeTextArea());

createApp(App).mount("#app");
