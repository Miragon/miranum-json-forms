import { FormBuilderData } from "../../../utils";

export let confirm: any = null;
export function confirmed() {
    return new Promise((resolve) => {
        confirm = (response: boolean) => {
            resolve(response);
        };
    });
}

export let initialize: any = null;
export function initialized() {
    return new Promise((resolve) => {
        initialize = (response: FormBuilderData | undefined) => {
            resolve(response);
        };
    });
}

export function instanceOfFormBuilderData(object: any): object is FormBuilderData {
    return "schema" in object || "uischema" in object;
}
