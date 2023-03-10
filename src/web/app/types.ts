import { JsonSchema, UISchemaElement } from '@jsonforms/core'

export interface FormBuilderData {
    schema?: JsonSchema;
    uischema?: UISchemaElement;
}

export interface VscMessage {
    type: string;
    mode: string;
    data?: FormBuilderData;
    confirm?: boolean;
    message?: string;
}

export interface VscState {
    data?: FormBuilderData;
}

export enum MessageType {
    "initialize" = "initialize",
    "restore" = "restore",
    "confirmation" = "confirmation",
    "updateFromExtension" = "updateFromExtension",
    "updateFromWebview" = "updateFromWebview",
    "undo" = "undo",
    "redo" = "redo",
    "info" = "info",
    "error" = "error",
}
