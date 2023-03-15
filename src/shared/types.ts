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

export interface VscMessage<T> {
    type: string;
    data?: T;
    confirm?: boolean;
    message?: string;
}

export interface VscState<T> {
    mode: string
    data?: T;
}
