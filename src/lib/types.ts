import {TextDocument} from "vscode";

export interface Subject {
    subscribe(...observers: Observer[]): void
    unsubscribe(...observers: Observer[]): void
    notify(): void
}

export interface Observer {
    update(value: any): void
}

export interface DocumentManager<ContentType> extends Subject {
    document: TextDocument
    readonly content: ContentType
    setInitialDocument(document: TextDocument): void
    writeToDocument(content: ContentType): Promise<boolean>
}

export interface UIComponent {
    readonly isOpen: boolean
    open(...data: any[]): void
    close(key?: string): void
    toggle(...data: any[]): void
}
