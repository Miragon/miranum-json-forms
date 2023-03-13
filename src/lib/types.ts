import {TextDocument, Uri} from "vscode";

export interface Subject {
    subscribe(...observers: Observer[]): void
    unsubscribe(...observers: Observer[]): void
    notify(): void
}

export interface Observer {
    update(value: any): void
}

export interface DocumentManager extends Subject {
    document: TextDocument
    getContent(): any
    setInitialDocument(document: TextDocument): void
    //setDocument(document: TextDocument): void
    writeToDocument(documentUri: Uri, content: any): Promise<boolean>
}

export interface UIComponent {
    readonly isOpen: boolean
    open(data?: any): void
    close(): void
    toggle(data?: any): void
}
