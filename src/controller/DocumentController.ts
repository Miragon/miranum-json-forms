/**
 * This module contains the DocumentController for `Miranum Forms`.
 * It manages the document and updates all subscribed components when changes occur.
 * @module DocumentController
 */

import * as vscode from 'vscode';
import {TextDocument, Uri} from 'vscode';
import {Observer, Subject, DocumentManager} from "../lib";
import {FormBuilderData} from "../utils";
import { debounce } from "lodash";
import {BuildInPreview, Logger, TextEditorComponent} from "../components";
import {MessageType} from "../shared/types";

export class DocumentController<ContentType extends FormBuilderData> implements Subject, DocumentManager {

    /** @hidden */
    public writeToDocument = this.asyncDebounce(this.write, 50);
    //private static instance: DocumentController;
    /** Array of all subscribed components. */
    private observers: Observer[] = [];
    /** @hidden */
    private _document?: TextDocument;

    public constructor() {
        //vscode.workspace.onDidChangeTextDocument((event) => {
        //    if (event.document.uri.toString() === this._document?.uri.toString() && event.contentChanges.length !== 0) {
        //        this.updatePreview();
        //    }
        //})
        Logger.info("[Miranum.JsonForms.DocumentContr] DocumentController was created.")
    }

    /**
     * Get the current instance or create a new one. Ensures that there is always only one instance (Singleton).
     */
    //public static getInstance(): DocumentController {
    //    if (this.instance === undefined) {
    //        this.instance = new DocumentController();
    //    }
    //    return this.instance;
    //}

    /**
     * Subscribe to get notified when changes are made to the document.
     * @param observers One or more observers which subscribe for notification.
     */
    public subscribe(...observers: Observer[]): void {
        this.observers = this.observers.concat(observers);
        Logger.info("[Miranum.JsonForms.DocumentContr]", `${observers.length} Observer(s) subscribed.`)
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
        if (!this.document.getText()) {
            if (await this.write(document.uri, this.getDefault())) {
                this.document.save();
            }
        }
        Logger.info("[Miranum.JsonForms.DocumentContr]", "Initial document was set.")
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
    public getContent(): ContentType {
        try {
            return this.getJsonFormFromString(this.document.getText());
        } catch (error) {
            throw error;
        }
    }

    public notify() {
        for (const observer of this.observers) {
            try {
                if (observer instanceof BuildInPreview) {
                    observer.update({
                        type: `${observer.viewType}.${MessageType.updateFromExtension}`,
                        data: this.getContent()
                    })
                } else if (observer instanceof TextEditorComponent) {
                    observer.update(this.document);
                }
            } catch (error) {
                const message = (error instanceof Error) ? error.message : "Couldn't update webview.";
                Logger.error("[Miranum.JsonForms.DocumentContr]", message);
            }
        }
    }


    /**
     * Parses a given string to json.
     * @param text
     * @private
     */
    private getJsonFormFromString(text: string): ContentType {
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
     * Only updates the preview and ignores other observers.
     */
    //public updatePreview(): void {
    //    this.observers.forEach((observer) => {
    //        try {
    //            switch (true) {
    //                case observer instanceof Preview: {
    //                    observer.update(this.content);
    //                    break;
    //                }
    //            }
    //        } catch (error) {
    //            const message = (error instanceof Error) ? error.message : "Couldn't update preview.";
    //            Logger.error("[Miranum.JsonForms.DocumentContr]", message);
    //        }
    //    });
    //}

    /**
     * Apply changes to the document.
     * @param uri The URI of the document that should be updated.
     * @param content The data which was sent from the webview.
     * @returns Promise
     */
    private async write(uri: Uri, content: ContentType): Promise<boolean> {
        try {
            if (this.document.uri != uri) {
                throw Error("Inconsistent document!");
            } else if (JSON.stringify(this.getContent()) === JSON.stringify(content)) {
                throw Error("No changes to apply!")
            }

            const edit = new vscode.WorkspaceEdit();
            const text = JSON.stringify(content, undefined, 4);

            edit.replace(
                this.document.uri,
                new vscode.Range(0, 0, this.document.lineCount, 0),
                text
            );

            return vscode.workspace.applyEdit(edit);
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

    /**
     * Get the default content which is displayed when the data model is empty.
     */
    private getDefault(): ContentType {
        return JSON.parse(JSON.stringify({
            "schema": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "minLength": 3,
                        "description": "Please enter your name"
                    },
                    "vegetarian": {
                        "type": "boolean"
                    },
                    "birthDate": {
                        "type": "string",
                        "format": "date",
                        "description": "Please enter your birth date."
                    },
                    "nationality": {
                        "type": "string",
                        "enum": [
                            "DE",
                            "IT",
                            "JP",
                            "US",
                            "RU",
                            "Other"
                        ]
                    },
                    "personalData": {
                        "type": "object",
                        "properties": {
                            "age": {
                                "type": "integer",
                                "description": "Please enter your age."
                            },
                            "height": {
                                "type": "number"
                            },
                            "drivingSkill": {
                                "type": "number",
                                "maximum": 10,
                                "minimum": 1,
                                "default": 7
                            }
                        },
                        "required": [
                            "age",
                            "height"
                        ]
                    },
                    "occupation": {
                        "type": "string"
                    },
                    "postalCode": {
                        "type": "string",
                        "maxLength": 5
                    }
                },
                "required": [
                    "occupation",
                    "nationality"
                ]
            },
            "uischema": {
                "type": "VerticalLayout",
                "elements": [
                    {
                        "type": "HorizontalLayout",
                        "elements": [
                            {
                                "type": "Control",
                                "scope": "#/properties/name"
                            },
                            {
                                "type": "Control",
                                "scope": "#/properties/personalData/properties/age"
                            },
                            {
                                "type": "Control",
                                "scope": "#/properties/birthDate"
                            }
                        ]
                    },
                    {
                        "type": "Label",
                        "text": "Additional Information"
                    },
                    {
                        "type": "HorizontalLayout",
                        "elements": [
                            {
                                "type": "Control",
                                "scope": "#/properties/personalData/properties/height"
                            },
                            {
                                "type": "Control",
                                "scope": "#/properties/nationality"
                            },
                            {
                                "type": "Control",
                                "scope": "#/properties/occupation",
                                "suggestion": [
                                    "Accountant",
                                    "Engineer",
                                    "Freelancer",
                                    "Journalism",
                                    "Physician",
                                    "Student",
                                    "Teacher",
                                    "Other"
                                ]
                            }
                        ]
                    }
                ]
            }
        }));
    }
}
