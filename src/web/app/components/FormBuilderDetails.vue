<script setup lang="ts">
import { ref, toRaw, watch } from "vue";
import { JsonForms } from "@jsonforms/vue";
import { createAjv } from "@jsonforms/core";
import { vanillaRenderers } from "@jsonforms/vue-vanilla";

import { boplusVueVanillaRenderers, createI18nTranslate } from "@backoffice-plus/formbuilder";
import ResizeArea from "./ResizeArea.vue";
import { translationsErrors as localeCatalogue } from "../translations/de";
import { FormBuilderData } from "../../../utils";

interface Props {
    jsonForm: FormBuilderData | undefined;
}

const props = defineProps<Props>();

const jsonFormsSchema = ref(props.jsonForm?.schema);
const jsonFormsUiSchema = ref(props.jsonForm?.uischema);
const jsonFormsData = ref({});
const jsonFormsUpdated = ref<{ data?: any; errors?: any }>({
    data: undefined,
    errors: undefined,
});

const jsonFormRenderesMore = Object.freeze([...vanillaRenderers, ...boplusVueVanillaRenderers]);

watch(
    () => props.jsonForm,
    (value) => {
        jsonFormsSchema.value = value?.schema;
        jsonFormsUiSchema.value = value?.uischema;

        const isArray = "array" === jsonFormsSchema.value?.type;

        jsonFormsData.value = props.jsonForm ?? (isArray ? [] : {});
    },
);

/**
 * @see https://ajv.js.org/options.html#advanced-options
 */
const ajv = createAjv({
    validateSchema: false, //ignore $schema
    addUsedSchema: false, //ignore $id
    //missingRefs : 'ignore',
    //inlineRefs: false,
}); //is needed because reactive :schema & :uischema will throw error

function extractData(update: any) {
    const props = ["schema", "uischema"];
    const data: any = toRaw(update.data);
    const errors: [any] = toRaw(update.errors);

    // TODO: parallelize this
    let newData: any = {};
    for (const key in data) {
        if (!props.includes(key)) {
            newData[key] = data[key];
        }
    }

    let newErrors = [];
    for (const error of errors) {
        newErrors.push({
            message: error.message,
            schemaPath: error.schemaPath,
        });
    }

    jsonFormsUpdated.value.data = newData;
    jsonFormsUpdated.value.errors = newErrors;
}
</script>

<template>
    <div class="formBuilderDetails flex flex-col-reverse gap-4">
        <details v-if="false !== jsonFormsUiSchema" open>
            <summary class="cursor-pointer">JsonForms Preview</summary>
            <ResizeArea>
                <div class="card styleA p-4" style="min-height: 106px">
                    <Suspense>
                        <JsonForms
                            :schema="jsonFormsSchema"
                            :uischema="jsonFormsUiSchema"
                            :data="jsonFormsData"
                            :renderers="jsonFormRenderesMore"
                            :ajv="ajv"
                            :i18n="{ translate: createI18nTranslate(localeCatalogue) }"
                            v-if="jsonFormsSchema && jsonFormsUiSchema"
                            @change="(r) => extractData(r)"
                        />
                        <template #fallback> JsonForms Loading... </template>
                    </Suspense>
                </div>
            </ResizeArea>

            <details open class="pt-4">
                <summary class="cursor-pointer">Data</summary>
                <div class="styleA flex gap-4">
                    <textarea class="h-60 p-4" readonly disabled>{{ jsonFormsUpdated.data }}</textarea>
                    <textarea class="h-60 p-4 text-red-600" readonly disabled>{{
                        jsonFormsUpdated.errors
                    }}</textarea>
                </div>
            </details>
        </details>
    </div>
</template>

<style>
.outputField {
    @apply h-60 w-full
  rounded
  border
  border-gray-300/50 bg-transparent
  p-4;
}
</style>
