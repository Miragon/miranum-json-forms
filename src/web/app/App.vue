<template>
    <div class="vscode container mx-auto flex max-w-screen-lg flex-col gap-4 p-4">
        <div v-if="mode === 'jsonforms-builder'">
            <vscode-checkbox
                :checked="schemaReadOnly"
                @change="
                    (event) => {
                        schemaReadOnly = event.target.checked;
                    }
                "
            >
                Schema ReadOnly
            </vscode-checkbox
            >
            <br />
        </div>

        <FormBuilder
            :key="key + (schemaReadOnly ? 1 : 0)"
            :jsonForms="jsonForms"
            :jsonFormsRenderers="jsonFormsRenderers"
            :schemaReadOnly="schemaReadOnly"
            :tools="tools"
            v-show="mode === 'jsonforms-builder'"
            @schemaUpdated="sendChangesToExtension"
        />
        <FormBuilderDetails
            :jsonForms="jsonForms"
            v-if="mode === 'jsonforms-renderer'"
        />
    </div>
</template>

<script setup lang="ts">
import { onBeforeMount, onUnmounted, ref } from "vue";
import { boplusVueVanillaRenderers, defaultTools, FormBuilder } from "@backoffice-plus/formbuilder";
import { JsonSchema, UISchemaElement } from "@jsonforms/core";
import { vanillaRenderers } from "@jsonforms/vue-vanilla";
import { debounce } from "lodash";

import FormBuilderDetails from "./components/FormBuilderDetails.vue";
import {
    confirm,
    confirmed,
    initialize,
    initialized,
    instanceOfFormBuilderData,
    StateController
} from "@/composables";
import { FormBuilderData } from "../../utils";
import { MessageType, VscMessage } from "../../shared/types";

declare const globalViewType: string;
const stateController = new StateController();
let isUpdateFromExtension = false;

const tools = [...defaultTools];

const jsonFormsRenderers = Object.freeze([...vanillaRenderers, ...boplusVueVanillaRenderers]);

const schemaReadOnly = ref(false);
const jsonForms = ref<FormBuilderData>();
const mode = ref(globalViewType);
const key = ref(0);

function updateForm(schema?: JsonSchema, uischema?: UISchemaElement): void {
    jsonForms.value = {
        schema: schema,
        uischema: uischema
    };
    stateController.updateState({
        mode: globalViewType,
        data: { schema, uischema }
    });

    // todo: Is there a better way to reload the component?
    key.value++;
}

const getDataFromExtension = debounce(receiveMessage, 50);

function receiveMessage(message: MessageEvent<VscMessage<FormBuilderData>>): void {
    try {
        isUpdateFromExtension = true;

        const type = message.data.type;
        const data = message.data.data;

        switch (type) {
            case `jsonforms-builder.${MessageType.initialize}`: {
                initialize(data);
                break;
            }
            case `jsonforms-builder.${MessageType.restore}`: {
                initialize(data);
                break;
            }
            case `jsonforms-builder.${MessageType.confirmation}`: {
                isUpdateFromExtension = false;
                confirm(message.data.confirm ?? false);
                break;
            }
            case `jsonforms-builder.${MessageType.undo}`:
            case `jsonforms-builder.${MessageType.redo}`:
            case `jsonforms-builder.${MessageType.updateFromExtension}`: {
                updateForm(data?.schema, data?.uischema);
                break;
            }
            case `jsonforms-renderer.${MessageType.initialize}`: {
                initialize(data);
                break;
            }
            case `jsonforms-renderer.${MessageType.restore}`: {
                initialize(data);
                break;
            }
            case `jsonforms-renderer.${MessageType.updateFromExtension}`: {
                updateForm(data?.schema, data?.uischema);
                break;
            }
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Could not handle message";
        postMessage(MessageType.error, undefined, message);
    }
}

const sendChangesToExtension = debounce(updateFile, 100);

function updateFile(data: FormBuilderData) {
    if (isUpdateFromExtension) {
        isUpdateFromExtension = false;
        return;
    }
    stateController.updateState({
        mode: globalViewType,
        data
    });
    postMessage(MessageType.updateFromWebview, data);
}

function postMessage(type: MessageType, data?: FormBuilderData, message?: string): void {
    switch (type) {
        case MessageType.updateFromWebview: {
            stateController.postMessage({
                type: `${globalViewType}.${type}`,
                data: JSON.parse(JSON.stringify(data))
            });
            break;
        }
        default: {
            stateController.postMessage({
                type: `${globalViewType}.${type}`,
                message
            });
            break;
        }
    }
}

// @ts-ignore
window.confirm = async function(message: string | undefined) {
    const msg = message ? message : "";
    postMessage(MessageType.confirmation, undefined, msg);
    return await confirmed();
};

onBeforeMount(async () => {
    window.addEventListener("message", getDataFromExtension);
    try {
        isUpdateFromExtension = true;
        const state = stateController.getState();
        if (state && state.data) {
            postMessage(MessageType.restore, undefined, "State was restored successfully.");
            mode.value = state.mode;
            let schema = state.data.schema;
            let uischema = state.data.uischema;
            const newData = await initialized(); // await the response form the backend
            if (newData && instanceOfFormBuilderData(newData)) {
                // we only get new data when the user made changes while the webview was destroyed
                if (newData.schema) {
                    schema = newData.schema;
                }
                if (newData.uischema) {
                    uischema = newData.uischema;
                }
            }
            updateForm(schema, uischema);
        } else {
            postMessage(MessageType.initialize, undefined, "Webview was loaded successfully.");
            const data = await initialized(); // await the response form the backend
            if (data && instanceOfFormBuilderData(data)) {
                updateForm(data.schema, data.uischema);
            }
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to initialize webview.";
        postMessage(MessageType.error, undefined, message);
    }

    postMessage(MessageType.info, undefined, "Webview was initialized.");
});

onUnmounted(() => {
    window.removeEventListener("message", getDataFromExtension);
});
</script>

<style>
.card {
    @apply rounded bg-white shadow;
}

.formbuilder nav {
    box-shadow: 0 8px 8px -8px rgb(30, 30, 30, 30%);
    z-index: 9;
    @apply sticky top-0 pt-2;
}
</style>
