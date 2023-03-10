/**
 * This module contains the PreviewComponent for `Miranum Forms`.
 * It handles a webview that renders the json schema.
 * @module PreviewComponent
 */

import * as vscode from "vscode";
import {getHtmlForWebview} from "../utils";
import {Preview, WebviewOptions} from "../lib"
import {FormBuilderData, MessageType} from "../web/app/types";
import {Logger} from "./Logger";

export class PreviewComponent extends Preview<FormBuilderData> {

    /** Unique identifier for the preview. */
    public readonly viewType = 'jsonform-renderer';
    /** Object that contains information for the webview. */
    protected readonly webviewOptions: WebviewOptions = {
        title: 'JsonForm Renderer',
        icon: vscode.Uri.joinPath(this.extensionUri, 'resources/logo_blau.png'),
        msgType: `${this.viewType}.${MessageType.updateFromExtension}`,
    };

    constructor(protected readonly extensionUri: vscode.Uri) {
        super();
        Logger.info("[Miranum.JsonForms.Preview]", "Preview was created.")
    }

    /**
     * Returns the html content that is rendered inside the webview.
     * @param webview The webview.
     * @param extensionUri The URI of the extension.
     * @param content The json schema.
     * @protected
     */
    protected getHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
        return getHtmlForWebview(webview, extensionUri, 'renderer');
    }
}
