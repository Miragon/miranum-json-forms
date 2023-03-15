/**
 * This module contains the DocumentController for `Miranum Forms`.
 * It manages the document and updates all subscribed components when changes occur.
 * @module DocumentController
 */

import * as vscode from 'vscode';
import {TextDocument} from 'vscode';
import { debounce } from "lodash";
import {JsonSchema, Layout} from "@jsonforms/core";
import {Observer, DocumentManager} from "../lib";
import {MessageType} from "../shared/types";
import {FormBuilderData} from "../utils";
import {BuildInPreview, Logger, TextEditorComponent} from "../components";

export class DocumentController<ContentType extends JsonSchema | Layout> implements DocumentManager<ContentType> {

    /** @hidden */
    public writeToDocument = this.asyncDebounce(this.write, 50);

    private static edit = new vscode.WorkspaceEdit();

    /** Array of all subscribed components. */
    private observers: Observer[] = [];

    /** @hidden */
    private _document?: TextDocument;


    public constructor() {
        Logger.info("[Miranum.JsonForms.DocumentController] DocumentController was created.")
    }

    /**
     * Subscribe to get notified when changes are made to the document.
     * @param observers One or more observers which subscribe for notification.
     */
    public subscribe(...observers: Observer[]): void {
        this.observers = this.observers.concat(observers);
        Logger.info("[Miranum.JsonForms.DocumentController]", `${observers.length} Observer(s) subscribed.`)
    }

    public unsubscribe(...observers: Observer[]): void {
        this.observers = this.observers.filter((observer) => !observers.includes(observer));
    }

    /**
     * Set the initial document.
     * @param document The initial document.
     */
    public async setInitialDocument(document: TextDocument) {
        this._document = document;
        // todo How to proceed with an empty document?
        if (!this.document.getText()) {
            const content = this.content
            if (this.instanceOfJsonSchema(content)) {
                //if (await this.write(getMinimumJsonSchema<JsonSchema>())) {
                //    this.document.save();
                //}
            } else if (this.instanceOfLayout(content)) {
                //if (await this.write(getMinimumLayout<Layout>())) {
                //    this.document.save();
                //}
            }
        }
        Logger.info("[Miranum.JsonForms.DocumentController]", "Initial document was set.")
    }

    /**
     * Set a new document.
     * @param document The new document.
     */
    public set document(document: TextDocument) {
        this._document = document;
        this.notify();
    }

    public get document(): TextDocument {
        if (!this._document) {
            throw Error("Document is not set!");
        }
        return this._document;
    }

    /**
     * Get the content of the active document.
     **/
    public get content(): ContentType {
        try {
            return this.getJsonFromString(this.document.getText());
        } catch (error) {
            throw error;
        }
    }

    public async notify() {
        try {
            let data: Partial<FormBuilderData> | undefined;
            const content = this.content
            if (this.instanceOfJsonSchema(content)) {
                data = { schema: content }
            } else if (this.instanceOfLayout(content)) {
                data = { uischema: content }
            }

            for (const observer of this.observers) {
                try {
                    if (observer instanceof BuildInPreview) {
                        await observer.update({
                            type: `${observer.viewType}.${MessageType.updateFromExtension}`,
                            data
                        })
                    } else if (observer instanceof TextEditorComponent) {
                        await observer.update(this.document);
                    }
                } catch (error) {
                    const message = (error instanceof Error) ? error.message : `${error}`;
                    Logger.error("[Miranum.JsonForms.DocumentController]", message);
                }
            }
        } catch (error) {
            const message = (error instanceof Error) ? error.message : `${error}`;
            Logger.error("[Miranum.JsonForms.DocumentController]", message);
        }
    }

    /**
     * Parses a given string to json.
     * @param text
     * @private
     */
    private getJsonFromString(text: string): ContentType {
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
     * Apply changes to the document.
     * @param content The data which was sent from the webview.
     * @returns Promise
     */
    private async write(content: ContentType): Promise<boolean> {
        try {
            if (JSON.stringify(this.content) === JSON.stringify(content)) {
                throw Error("No changes to apply!")
            }

            const text = JSON.stringify(content, undefined, 4);

            if (DocumentController.edit.has(this.document.uri)) {
                DocumentController.edit = new vscode.WorkspaceEdit();
            }

            DocumentController.edit.replace(
                this.document.uri,
                new vscode.Range(0, 0, this.document.lineCount, 0),
                text
            );

            return vscode.workspace.applyEdit(DocumentController.edit);
        } catch (error) {
            return Promise.reject(error);
        }
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

    private instanceOfLayout(object: any): object is Layout {
        return ("type" in object && "elements" in object)
    }

    private instanceOfJsonSchema(object: any): object is JsonSchema {
        return ("type" in object && "properties" in object)
    }
}
