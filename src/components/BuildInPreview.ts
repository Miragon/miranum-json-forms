/**
 * This module contains the PreviewComponent for `Miranum Forms`.
 * It handles a webview that renders the json schema.
 * @module PreviewComponent
 */

import * as vscode from "vscode";
import {Disposable, WebviewPanel} from "vscode";
import {CloseCaller, DocumentManager, Preview, ViewState, WebviewOptions} from "../lib"
import {FormBuilderData, getHtmlForWebview} from "../utils";
import {Logger} from "./Logger";
import {MessageType, VscMessage} from "../shared/types";

export class BuildInPreview extends Preview {

    /** Unique identifier for the preview. */
    public readonly viewType = "jsonforms-renderer";

    /** Object that contains information for the webview. */
    protected readonly webviewOptions: WebviewOptions = {
        title: 'JsonForm Renderer',
        icon: vscode.Uri.joinPath(this.extensionUri, 'resources/logo_blau.png'),
    };

    constructor(protected readonly extensionUri: vscode.Uri) {
        super();
        Logger.info("[Miranum.JsonForms.Preview]", "Preview was created.")
    }

    public async update(message: VscMessage<FormBuilderData>) {
        try {
            if (await this.webview.postMessage(message)) {
                this.isBuffer = false;
            } else {
                throw Error(`Couldn't update preview (${this.title}).`);
            }
        } catch (error) {
            this.isBuffer = true;
            throw error
        }
    }

    /**
     * Returns the html content that is rendered inside the webview.
     * @param webview The webview.
     * @param extensionUri The URI of the extension.
     * @protected
     */
    protected getHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
        return getHtmlForWebview(webview, extensionUri);
    }

    protected setEventHandlers(document: DocumentManager, webviewPanel: WebviewPanel): Disposable[] {
        const disposables: Disposable[] = []

        vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.document.uri.toString() === document.document.uri.toString() && event.contentChanges.length !== 0) {
                this.update({
                    type: `${this.viewType}.${MessageType.updateFromExtension}`,
                    data: document.getContent()
                });
            }
        })

        webviewPanel.webview.onDidReceiveMessage((message: VscMessage<FormBuilderData>) => {
            try {
                switch (message.type) {
                    case `jsonforms-builder.${MessageType.initialize}`: {
                        this.update({
                            type: `${this.viewType}.${MessageType.initialize}`,
                            data: document.getContent()
                        });
                        break;
                    }
                    case `jsonforms-builder.${MessageType.restore}`: {
                        this.update({
                            type: `${this.viewType}.${MessageType.restore}`,
                            data: (this.isBuffer) ? document.getContent() : undefined
                        });
                        break;
                    }
                }
            } catch (error) {
                const message = (error instanceof Error) ? error.message : `${error}`;
                Logger.error("[Miranum.JsonForms.Preview]", `(Webview: ${webviewPanel.title})`, message);
            }
        });

        webviewPanel.onDidChangeViewState((event) => {
            switch (true) {
                case event.webviewPanel?.visible: {
                    if (this.isBuffer) {
                        this.update({
                            type: `${this.viewType}.${MessageType.restore}`,
                            data: document.getContent()
                        });
                    }
                }
            }
        }, null, disposables);

        webviewPanel.onDidDispose(() => {
            // update lastViewState
            switch (this.closeCaller) {
                case CloseCaller.undefined:
                case CloseCaller.explicit: {
                    this._lastViewState = ViewState.closed;
                    break;
                }
                case CloseCaller.implicit: {
                    this._lastViewState = ViewState.open;
                    break;
                }
            }
            this.closeCaller = CloseCaller.undefined;   // reset

            // actually dispose
            this.dispose();
        }, null, disposables);

        return disposables;
    }
}
