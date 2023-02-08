import {registerExamples} from "@jsonforms/examples/src/register";
import {schema, uischema} from "@backoffice-plus/formbuilder/src/schema/toolOptionsCombinatorWithRefs";

export const data = {};

registerExamples([
  {
    name: 'optionModalCombinator',
    label: 'FormBuilder - OptionModal Combinator',
    data,
    schema,
    uischema
  }
]);
