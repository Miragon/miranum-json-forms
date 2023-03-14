/**
 * This module contains the DocumentController for `Miranum Forms`.
 * It manages the document and updates all subscribed components when changes occur.
 * @module DocumentController
 */

import * as vscode from 'vscode';
import {TextDocument, Uri} from 'vscode';
import {Observer, DocumentManager} from "../lib";
import {FormBuilderData} from "../utils";
import { debounce } from "lodash";
import {BuildInPreview, Logger, TextEditorComponent} from "../components";
import {MessageType} from "../shared/types";

export class DocumentController implements DocumentManager {

    /** @hidden */
    public writeToDocument = this.asyncDebounce(this.write, 50);

    /** Array of all subscribed components. */
    private observers: Observer[] = [];

    /** @hidden */
    private _document?: TextDocument;

    private tmpChangedData?: { uri: Uri, value: string };


    public constructor() {
        Logger.info("[Miranum.JsonForms.DocumentContr] DocumentController was created.")
    }

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

    public get tmpData(): { uri: Uri, value: string } {
        if (!this.tmpChangedData) {
            throw Error("No temporary data available.");
        }
        return this.tmpChangedData;
    }

    /**
     * Get the content of the active document.
     **/
    public async getContent(): Promise<FormBuilderData> {
        async function readFile(uri: Uri): Promise<string> {
            return Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf-8");
        }

        const [ext, rest] = this.getFileExtension();
        try {
            if (ext === "schema.json") {
                return {
                    schema: JSON.parse(this.document.getText()),
                    uischema: JSON.parse(this.tmpData.value)
                }
            } else {
                return {
                    schema: JSON.parse(this.tmpData.value),
                    uischema: JSON.parse(this.document.getText())
                }
            }
        } catch (error) {
            if (ext === "schema.json") {
                return {
                    schema: JSON.parse(this.document.getText()),
                    uischema: JSON.parse(await readFile(Uri.file(`${rest}.uischema.json`)))
                }
            } else {
                return {
                    schema: JSON.parse(await readFile(Uri.file(`${rest}.schema.json`))),
                    uischema: JSON.parse(this.document.getText())
                }
            }
        }
    }

    public async notify() {
        for (const observer of this.observers) {
            try {
                if (observer instanceof BuildInPreview) {
                    await observer.update({
                        type: `${observer.viewType}.${MessageType.updateFromExtension}`,
                        data: await this.getContent()
                    })
                } else if (observer instanceof TextEditorComponent) {
                    await observer.update(this.document);
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
    //private getJsonFormFromString(text: string): ContentType {
    //    if (text.trim().length === 0) {
    //        return JSON.parse('{}');
    //    }

    //    try {
    //        return JSON.parse(text);
    //    } catch {
    //        throw new Error("Could not parse text!");
    //    }
    //}

    /**
     * Apply changes to the document.
     * @param uri The URI of the document that should be updated.
     * @param content The data which was sent from the webview.
     * @returns Promise
     */
    private async write(uri: Uri, content: FormBuilderData): Promise<boolean> {
        try {
            if (this.document.uri.toString() !== uri.toString()) {
                throw Error("Inconsistent document!");
            } else if (JSON.stringify(await this.getContent()) === JSON.stringify(content)) {
                throw Error("No changes to apply!")
            }

            const debug = await this.getContent();

            const [ext, rest] = this.getFileExtension();
            let text: string;
            if (ext === "schema.json") {
                text = JSON.stringify(content.schema, undefined, 4);
                this.tmpChangedData = {
                    uri: Uri.file(`${rest}.uischema.json`),
                    value: JSON.stringify(content.uischema, undefined, 4)
                };
            } else {
                text = JSON.stringify(content.uischema, undefined, 4);
                this.tmpChangedData = {
                    uri: Uri.file(`${rest}.schema.json`),
                    value: JSON.stringify(content.schema, undefined, 4)
                };
            }

            const edit = new vscode.WorkspaceEdit();
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

    private getFileExtension(): [string, string] {
        const pathParts = this.document.uri.path.split("/");
        const fileParts = pathParts[pathParts.length - 1].split(".");
        return [
            fileParts.slice(1).join("."),
            `${pathParts.slice(0, pathParts.length - 1).join("/")}/${fileParts[0]}`
        ]
    }

    /**
     * Get the default content which is displayed when the data model is empty.
     */
    private getDefault(): FormBuilderData {
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
