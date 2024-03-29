/**
 * This module contains the TextEditorComponent for `Miranum Forms`.
 * It handles a text editor which can be used for direct changes inside the document.
 * @module TextEditorComponent
 */

import { TextEditorShowOption, TextEditorWrapper } from "../lib";
import * as vscode from "vscode";
import { ConfigurationChangeEvent, ExtensionContext } from "vscode";
import { Logger } from "./Logger";

export class TextEditorComponent extends TextEditorWrapper {
    public readonly viewType = "jsonforms-textEditor";
    private static instance: TextEditorComponent;
    /** The default option how the text editor will be displayed. */
    protected showOption: TextEditorShowOption = TextEditorShowOption.Tab;

    private constructor() {
        super();
        Logger.info("[Miranum.JsonForms.TextEditor]", "Text editor was created.");
    }

    /**
     * Get the current instance or create a new one. Ensures that there is always only one instance (Singleton).
     */
    public static getInstance(): TextEditorComponent {
        if (!this.instance) {
            this.instance = new TextEditorComponent();
        }
        return this.instance;
    }
}
