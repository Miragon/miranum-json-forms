/**
 * This module contains the PreviewComponent for `Miranum Forms`.
 * It handles a webview that renders the json schema.
 * @module PreviewComponent
 */

import * as vscode from "vscode";
import {Disposable, WebviewPanel} from "vscode";
import {JsonSchema, Layout} from '@jsonforms/core'
import {CloseCaller, DocumentManager, Preview, ViewState, WebviewOptions} from "../lib"
import {MessageType, VscMessage} from "../shared/types";
import {FormBuilderData, getHtmlForWebview} from "../utils";
import {Logger} from "./Logger";

export class BuildInPreview extends Preview<DocumentManager<JsonSchema | Layout>> {

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

    public async update(message: VscMessage<Partial<FormBuilderData>>) {
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

    protected setEventHandlers(webviewPanel: WebviewPanel,
                               schema: DocumentManager<JsonSchema>,
                               uischema: DocumentManager<Layout>
    ): Disposable[] {

        const disposables: Disposable[] = []

        vscode.workspace.onDidChangeTextDocument(async (event) => {
            // todo only send the changed data and handle it accordingly in the webview.
            try {
                const data: FormBuilderData = {
                    schema: schema.content,
                    uischema: uischema.content
                }
                if ((event.document.uri.toString() === schema.document.uri.toString() ||
                        event.document.uri.toString() === uischema.document.uri.toString()) &&
                        event.contentChanges.length !== 0)
                {
                    try {
                        await this.update({
                            type: `${this.viewType}.${MessageType.updateFromExtension}`,
                            data
                        });
                    } catch (error) {
                        const message = (error instanceof Error) ? error.message : "Couldn't update webview.";
                        Logger.error("[Miranum.JsonForms.Preview]", message);
                    }
                }
            } catch (error) {
                const message = (error instanceof Error) ? error.message : `${error}`;
                Logger.error("[Miranum.JsonForms.Preview]", `(Webview: ${webviewPanel.title})`, message);
            }
        })

        webviewPanel.webview.onDidReceiveMessage(async (message: VscMessage<FormBuilderData>) => {
            try {
                const data: FormBuilderData = {
                    schema: schema.content,
                    uischema: uischema.content
                }
                switch (message.type) {
                    case `jsonforms-builder.${MessageType.initialize}`: {
                        await this.update({
                            type: `${this.viewType}.${MessageType.initialize}`,
                            data
                        });
                        break;
                    }
                    case `jsonforms-builder.${MessageType.restore}`: {
                        await this.update({
                            type: `${this.viewType}.${MessageType.restore}`,
                            data: (this.isBuffer) ? data : undefined
                        });
                        break;
                    }
                }
            } catch (error) {
                const message = (error instanceof Error) ? error.message : `${error}`;
                Logger.error("[Miranum.JsonForms.Preview]", `(Webview: ${webviewPanel.title})`, message);
            }
        });

        webviewPanel.onDidChangeViewState(async (event) => {
            try {
                const data: FormBuilderData = {
                    schema: schema.content,
                    uischema: uischema.content
                }
                switch (true) {
                    case event.webviewPanel?.visible: {
                        if (this.isBuffer) {
                            await this.update({
                                type: `${this.viewType}.${MessageType.restore}`,
                                data
                            });
                        }
                    }
                }
            } catch (error) {
                const message = (error instanceof Error) ? error.message : "Couldn't update webview.";
                Logger.error("[Miranum.JsonForms.Preview]", message);
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
