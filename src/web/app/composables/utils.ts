import {FormBuilderData, MessageType} from "@/types";

export let confirm: any = null;
export function confirmed() {
    // this promise resolves when confirm() is called!
    return new Promise((resolve) => {
        confirm = (response: boolean) => { resolve(response) }
    })
}

export let initialize: any = null;
export function initialized() {
    // this promise resolves when confirm() is called!
    return new Promise((resolve) => {
        confirm = (response: FormBuilderData | undefined) => { resolve(response) }
    })
}

export function instanceOfFormBuilderData(object: any): object is FormBuilderData {
    return ("schema" in object || "uischema" in object);
}
