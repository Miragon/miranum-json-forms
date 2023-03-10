/**
 * This module contains the DocumentController for `Miranum Forms`.
 * It manages the document and updates all subscribed components when changes occur.
 * @module DocumentController
 */

import * as vscode from 'vscode';
import {TextDocument, Uri} from 'vscode';
import {IContentController, Preview, TextEditorWrapper, Updatable} from "../lib";
import {getDefault} from "../utils";
import { debounce } from "lodash";
import {FormBuilderData} from "../web/app/types";
import {Logger} from "../components";

export class DocumentController implements IContentController<TextDocument | FormBuilderData> {

    /** @hidden */
    public writeData = this.asyncDebounce(this.writeChangesToDocument, 50);
    private static instance: DocumentController;
    /** Array of all subscribed components. */
    private observers: Updatable<TextDocument | FormBuilderData>[] = [];
    /** @hidden */
    private _document: TextDocument | undefined;

    private constructor() {
        vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.document.uri.toString() === this.document.uri.toString() && event.contentChanges.length !== 0) {
                this.updatePreview();
            }
        })
        Logger.info("[Miranum.JsonForms.DocumentContr] DocumentController was created.")
    }

    /**
     * Get the current instance or create a new one. Ensures that there is always only one instance (Singleton).
     */
    public static getInstance(): DocumentController {
        if (this.instance === undefined) {
            this.instance = new DocumentController();
        }
        return this.instance;
    }

    /**
     * Subscribe to get notified when changes are made to the document.
     * @param observer One or more observers which subscribe for notification.
     */
    public subscribe(...observer: Updatable<TextDocument | FormBuilderData>[]): void {
        this.observers = this.observers.concat(observer);

        const types: string[] = [];
        if (Array.isArray(observer)) {
            for (const obs of observer) {
                types.push(`\n\t\t\t- ${obs.viewType})`);
            }
        }
        Logger.info("[Miranum.JsonForms.DocumentContr]", "Observer subscribed.", types.join())
    }

    /**
     * Get the content of the active document.
     **/
    public get content(): FormBuilderData {
        return this.getJsonFormFromString(this.document.getText());
    }

    /**
     * Get the active document.
     */
    public get document(): TextDocument {
        if (this._document) {
            return this._document;
        } else {
            throw new Error("Document is not initialized!");
        }
    }

    /**
     * Set a new document.
     * @param document The new document.
     */
    public set document(document: TextDocument) {
        this._document = document;
        this.observers.forEach((observer) => {
            try {
                switch (true) {
                    case observer instanceof Preview: {
                        const content = this.getJsonFormFromString(this.document.getText());
                        observer.update(content);
                        break;
                    }
                    case observer instanceof TextEditorWrapper: {
                        observer.update(this.document);
                        break;
                    }
                }
            } catch (error) {
                const message = (error instanceof Error) ? error.message : "Couldn't set document.";
                Logger.error("[Miranum.JsonForms.DocumentContr]", message);
            }
        });
    }

    /**
     * Parses a given string to json.
     * @param text
     * @private
     */
    public getJsonFormFromString(text: string): FormBuilderData {
        if (text.trim().length === 0) {
            return JSON.parse('{}');
        }

        try {
            return JSON.parse(text);
        } catch {
            throw new Error("Could not parse text!");
        }
    }

    /**
     * Set the initial document.
     * @param document The initial document.
     */
    public async setInitialDocument(document: TextDocument) {
        this._document = document;
        if (!this.document.getText()) {
            if (await this.writeChangesToDocument(document.uri, getDefault())) {
                this.document.save();
            }
        }
        Logger.info("[Miranum.JsonForms.DocumentContr]", "Initial document was set.")
    }

    /**
     * Only updates the preview and ignores other observers.
     */
    public updatePreview(): void {
        this.observers.forEach((observer) => {
            try {
                switch (true) {
                    case observer instanceof Preview: {
                        const content = this.getJsonFormFromString(this.document.getText());
                        observer.update(content);
                        break;
                    }
                }
            } catch (error) {
                const message = (error instanceof Error) ? error.message : "Couldn't update preview.";
                Logger.error("[Miranum.JsonForms.DocumentContr]", message);
            }
        });
    }

    /**
     * Apply changes to the document.
     * @param uri The URI of the document that should be updated.
     * @param content The data which was sent from the webview.
     * @returns Promise
     */
    private async writeChangesToDocument(uri: Uri, content: FormBuilderData): Promise<boolean> {
        if (this._document && this.document.uri != uri) {
            return Promise.reject('[DocumentController] Inconsistent document!');
        } else if (JSON.stringify(this.content) === JSON.stringify(content)) {
            return Promise.reject('[DocumentController] No changes to apply!');
        }

        const edit = new vscode.WorkspaceEdit();
        const text = JSON.stringify(content, undefined, 4);

        edit.replace(
            this.document.uri,
            new vscode.Range(0, 0, this.document.lineCount, 0),
            text
        );

        return vscode.workspace.applyEdit(edit);
    }

    private asyncDebounce<F extends(...args: any[]) => Promise<boolean>>(func: F, wait?: number) {
        const resolveSet = new Set<(p:boolean)=>void>();
        const rejectSet = new Set<(p:boolean)=>void>();

        const debounced = debounce((bindSelf, args: Parameters<F>) => {
            func.bind(bindSelf)(...args)
                .then((...res) => {
                    resolveSet.forEach((resolve) => resolve(...res));
                    resolveSet.clear();
                })
                .catch((...res) => {
                    rejectSet.forEach((reject) => reject(...res));
                    rejectSet.clear();
                });
        }, wait);

        return (...args: Parameters<F>): ReturnType<F> => new Promise((resolve, reject) => {
            resolveSet.add(resolve);
            rejectSet.add(reject);
            debounced(this, args);
        }) as ReturnType<F>;
    }
}
