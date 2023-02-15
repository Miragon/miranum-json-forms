<template>

  <div class="container max-w-screen-lg mx-auto p-4 flex flex-col gap-4">

    <div>
      Disable Formbuilder: <input type="checkbox" v-model="disableFormbuilder" /><br>
      Schema ReadOnly: <input type="checkbox" v-model="schemaReadOnly" /><br>
    </div>

    <FormBuilder
        :jsonForms="jsonForms"
        :schemaReadOnly="schemaReadOnly"
        :tools="tools"
        v-if="!disableFormbuilder"
        :key="key + (schemaReadOnly?1:0)"
    />
    <FormBuilderDetails :jsonForms="jsonFormsResolved" :key="(disableFormbuilder?1:0)" />
  </div>

</template>

<script setup lang="ts">
import {defaultTools, FormBuilder} from "@backoffice-plus/formbuilder";
import FormBuilderDetails from "./FormBuilderDetails.vue";
import {onMounted, onUnmounted, ref, unref, watch} from "vue";
import {VsCode} from "../../lib";
import {JsonForm} from "../../utils";
import {ExampleDescription} from "@jsonforms/examples";

// VS Code stuff
declare const vscode: VsCode
const state = vscode.getState();
const form: JsonForm = JSON.parse(state.text);

const tools = [
  ...defaultTools,
]

const oe = [];//import own examples

const schemaReadOnly = ref(false);
const disableFormbuilder = ref(false);
const jsonFormsResolved = ref({});
const jsonForms = ref<ExampleDescription>({
  name: 'test',
  label: 'test',
  data: form.data,
  schema: form.schema,
  uischema: form.uischema,
});
const key = 1234;

function updateForm(newForm: JsonForm): void {
  vscode.setState({
    text: JSON.stringify(newForm)
  });

  if (jsonForms.value) {
    console.log('updateForm() in', newForm);
    jsonForms.value.schema = newForm.schema
    jsonForms.value.uischema = newForm.uischema
    jsonForms.value.data = newForm.data
  }
}

function getDataFromExtension(msg: MessageEvent): void {
  const message = msg.data;
  const newForm: JsonForm = message.text;

  console.log('getDataFromExtension()', message.type, newForm);

  switch (message.type) {
    case 'jsonform-modeler.updateFromExtension': {
      updateForm(newForm);
      break;
    }
    case 'jsonform-modeler.undo':
    case 'jsonform-modeler.redo': {
      updateForm(newForm);
      break;
    }
    default:
      break;
  }
}

watch(() => jsonForms.value, async () => {
  jsonFormsResolved.value = unref(jsonForms.value);
  //jsonFormsResolved.value.schema = await resolveSchema(jsonFormsResolved.value.schema);
})

watch(jsonForms.value.schema, () => {
  console.log('watch()', jsonForms);
})

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
