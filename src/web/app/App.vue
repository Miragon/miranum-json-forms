<template>

  <div class="container max-w-screen-lg mx-auto p-4 flex flex-col gap-4">

    <div v-if="mode === 'modeler'">
      Disable Formbuilder: <input type="checkbox" v-model="disableFormbuilder" /><br>
      Schema ReadOnly: <input type="checkbox" v-model="schemaReadOnly" /><br>
    </div>

    <FormBuilder
        :key="key + (schemaReadOnly?1:0)"
        :jsonForms="jsonForms"
        :jsonFormsRenderers="jsonFormsRenderers"
        :schemaReadOnly="schemaReadOnly"
        :tools="tools"
        v-if="!disableFormbuilder"
        v-show="mode === 'modeler'"
        @schemaUpdated="sendChangesToExtension"
    />
    <FormBuilderDetails
        :key="(disableFormbuilder?1:0)"
        :jsonForms="jsonForms"
        v-if="mode === 'renderer'"
    />
  </div>

</template>

<script setup lang="ts">
import {onMounted, onUnmounted, ref} from "vue";
import {boplusVueVanillaRenderers, defaultTools, FormBuilder} from "@backoffice-plus/formbuilder";
import {JsonSchema, UISchemaElement} from "@jsonforms/core";
import {vanillaRenderers} from "@jsonforms/vue-vanilla";
import {debounce} from "lodash";

import FormBuilderDetails from "./components/FormBuilderDetails.vue";
import {confirm, confirmed, initialize, initialized, instanceOfFormBuilderData, StateController} from "@/composables";
import {FormBuilderData, MessageType, VscMessage} from "@/types";


const stateController = new StateController();
let isUpdateFromExtension = false;

const tools = [
  ...defaultTools,
];

const jsonFormsRenderers = Object.freeze([
    ...vanillaRenderers,
    ...boplusVueVanillaRenderers,
]);

const schemaReadOnly = ref(false);
const disableFormbuilder = ref(false);
const jsonForms = ref<FormBuilderData>();
const mode = ref("");
const key = ref(0);

function updateForm(schema?: JsonSchema, uischema?: UISchemaElement): void {
  jsonForms.value = {
    schema: schema,
    uischema: uischema,
  }
  stateController.updateState({ data: { schema, uischema } });

  // todo: Is there a better way to reload the component?
  key.value++;
}

const getDataFromExtension = debounce(receiveMessage, 50);
function receiveMessage(message: MessageEvent<VscMessage>): void {
  try {
    const type = message.data.type;
    const data = message.data.data;

    switch (type) {
      case `jsonforms-builder.${MessageType.initialize}`: {
        mode.value = message.data.mode;
        initialize(data);
        break;
      }
      case `jsonforms-builder.${MessageType.restore}`: {
        initialize(data);
        break;
      }
      case `jsonforms-builder.${MessageType.confirmation}`: {
        confirm(message.data.confirm ?? false);
        break
      }
      case `jsonforms-builder.${MessageType.undo}`:
      case `jsonforms-builder.${MessageType.redo}`:
      case `jsonforms-builder.${MessageType.updateFromExtension}`: {
        isUpdateFromExtension = true;
        updateForm(data?.schema, data?.uischema);
        break;
      }
      // todo add logic for renderer
      default:
        break;
    }
  } catch (error) {
    const message = (error instanceof Error) ? error.message : "Could not handle message";
    postMessage(MessageType.error, undefined, message);
  }
}

const sendChangesToExtension = debounce(postMessage, 10);
function postMessage(type: MessageType, data?: FormBuilderData, message?: string): void {
  if (isUpdateFromExtension) {
    isUpdateFromExtension = false // reset
    return;
  }

  switch (type) {
    case MessageType.updateFromWebview: {
      stateController.postMessage({
        type: `jsonforms-builder.${type}`,
        mode: mode.value,
        data
      });
      break;
    }
    default: {
      stateController.postMessage({
        type: `jsonforms-builder.${type}`,
        mode: mode.value,
        message
      });
      break;
    }
  }
}

// @ts-ignore
window.confirm = async function (message: string | undefined) {
  const msg = (message) ? message : "";
  postMessage(MessageType.confirmation, undefined, msg)
  return await confirmed();
}

onMounted(async () => {
  try {
    const state = stateController.getState();
    if (state && state.data) {
      postMessage(MessageType.restore, undefined, "State was restored successfully.");
      let schema = state.data.schema;
      let uischema = state.data.uischema;
      const newData = await initialized();    // await the response form the backend
      if (instanceOfFormBuilderData(newData)) {
        // we only get new data when the user made changes while the webview was destroyed
        if (newData.schema) {
          schema = newData.schema;
        }
        if (newData.uischema) {
          uischema = newData.uischema;
        }
      }
      return updateForm(schema, uischema);
    } else {
      postMessage(MessageType.initialize, undefined, "Webview was loaded successfully.");
      const data = await initialized();    // await the response form the backend
      if (instanceOfFormBuilderData(data)) {
        return updateForm(data.schema, data.uischema);
      }
    }
  } catch (error) {
    const message = (error instanceof Error) ? error.message : "Failed to initialize webview.";
    postMessage(MessageType.error, undefined, message);
  }

  window.addEventListener('message', getDataFromExtension);
})

onUnmounted(() => {
  window.removeEventListener('message', getDataFromExtension);
})

</script>


<style>
body {
  background-color: #f3f4f5;
}

.card {
  @apply
  bg-white rounded shadow
}
</style>
