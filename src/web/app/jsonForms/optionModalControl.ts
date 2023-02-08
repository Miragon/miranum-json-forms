import {registerExamples} from "@jsonforms/examples/src/register";
import {schema, uischema} from "@backoffice-plus/formbuilder/src/schema/toolOptionsControl";

export const data = {};

registerExamples([
  {
    name: 'optionModalControl',
    label: 'FormBuilder - OptionModal Control',
    data,
    schema,
    uischema
  }
]);
