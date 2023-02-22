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
    />
    <FormBuilderDetails
        :key="(disableFormbuilder?1:0)"
        :jsonForms="jsonForms"
    />
  </div>

</template>

<script setup lang="ts">
import {boplusVueVanillaRenderers, defaultTools, FormBuilder} from "@backoffice-plus/formbuilder";
import FormBuilderDetails from "./FormBuilderDetails.vue";
import {onMounted, onUnmounted, ref} from "vue";
import {vanillaRenderers} from "@jsonforms/vue-vanilla";
import {VsCode} from "../../lib";
import {JsonForm} from "../../utils";

// VS Code stuff
declare const vscode: VsCode
const state = vscode.getState();
const data: JsonForm = JSON.parse(state.text);
const mode = ref(state.mode);

const tools = [
  ...defaultTools,
];

const jsonFormsRenderers = Object.freeze([
    ...vanillaRenderers,
    ...boplusVueVanillaRenderers,
]);

const schemaReadOnly = ref(false);
const disableFormbuilder = ref(false);
//const jsonFormsResolved = ref({});
const jsonForms = ref<JsonForm>({
  data: data.data,
  schema: data.schema,
  uischema: data.uischema,
});
const key = ref(0);

function updateForm(newData: JsonForm): void {
  vscode.setState({
    ...vscode.getState(),
    text: JSON.stringify(newData)
  });
  jsonForms.value = {
    data: newData.data,
    schema: newData.schema,
    uischema: newData.uischema,
  }
  // todo: Is there a better way to reload the component?
  key.value++;
}

function getDataFromExtension(msg: MessageEvent): void {
  const message = msg.data;

  switch (message.type) {
    case 'jsonform-modeler.updateFromExtension': {
      updateForm(message.text);
      break;
    }
    case 'jsonform-modeler.undo':
    case 'jsonform-modeler.redo': {
      updateForm(message.text);
      break;
    }
    case 'jsonform-modeler.conformation': {
      confirm(message.text);
    }
    default:
      break;
  }
}

// todo: need a way to listen for updates to jsonForms in order to
//  * save the changes
//  * update the preview

// todo: delete button not working because vscode intentionally blocks modals in webviews
//  * override window.confirm() ???
let confirm: any = null;
function confirmed() {
  // this promise resolves when confirm() is called!
  return new Promise((resolve) => {
    confirm = (response: boolean) => { resolve(response) }
  })
}

// @ts-ignore
window.confirm = async function (message: string | undefined) {
  const msg = (message) ? message : "";
  vscode.postMessage({
   type: 'jsonform-modeler.confirmation',
   content: msg
  })
  return await confirmed();
  //return new Promise((resolve) => {
  //  window.addEventListener('message', (event) => {
  //    if (event.data.type === 'jsonform-modeler.onDelete') {
  //      console.log('resolve', event.data.text);
  //      resolve(event.data.text);
  //    }
  //  })
  //  switch (message) {
  //    case "Wirklich löschen?": {
  //      vscode.postMessage({
  //        type: 'jsonform-modeler.onDelete',
  //        content: message
  //      })
  //    }
  //  }
  //})
}

//watch(() => jsonForms.value, async () => {
//  jsonFormsResolved.value = unref(jsonForms.value);
//  //jsonFormsResolved.value.schema = await resolveSchema(jsonFormsResolved.value.schema);
//})

onMounted(() => {
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
