/**
 * This module contains the CustomTextEditorProvider for `Miranum Forms`.
 * It handles the webview and synchronizes the webview with the data model and a preview.
 * @module JsonSchemaBuilderProvider
 */

import * as vscode from 'vscode';
import {DocumentController} from "./controller";
import {Logger, PreviewComponent, TextEditorComponent} from "./components";
import {getHtmlForWebview, getMinimum} from './utils';
import {ViewState} from "./lib";
import {FormBuilderData, MessageType, VscMessage} from "./web/app/types";

/**
 * The [Custom Text Editor](https://code.visualstudio.com/api/extension-guides/custom-editors) uses a '.form'-File as its
 * data model and synchronize changes with the [webview](https://code.visualstudio.com/api/extension-guides/webview).
 * The webview is build with [Vue.js](https://vuejs.org/) and uses the
 * [DigiWF Form Builder](https://github.com/FlowSquad/digiwf-core/tree/dev/digiwf-apps/packages/components/digiwf-form-builder).
 * The provider also register a [command](https://code.visualstudio.com/api/extension-guides/command) for toggling the
 * standard vscode text editor and a preview for rendering [Json Schema](https://json-schema.org/).
 */
export class JsonSchemaBuilderProvider implements vscode.CustomTextEditorProvider {

    /** Unique identifier for the custom editor provider. */
    public static readonly VIEWTYPE = "jsonforms-builder";

    /** Number of currently open custom text editors with the view type `jsonschema-builder`. */
    private static counter = 0;
    /** The controller ({@link DocumentController}) manages the document (.form-file). */
    private readonly controller: DocumentController;
    /** The preview ({@link PreviewComponent}) renders the content of the active custom text editor. */
    private readonly preview: PreviewComponent;
    /** The text editor ({@link TextEditorComponent}) for direct changes inside the document. */
    private readonly textEditor: TextEditorComponent;
    /** An array with all disposables per webview panel. */
    private disposables: Map<string, vscode.Disposable[]> = new Map();
    /** @hidden Little helper to prevent the preview from closing after the text editor is opened. */
    private closePreview = true;

    /**
     * Register all components and controllers and set up all commands.
     * @param context The context of the extension
     */
    constructor(
        private readonly context: vscode.ExtensionContext
    ) {
        Logger.get().clear();

        // initialize components
        this.textEditor = TextEditorComponent.getInstance();
        this.textEditor.setShowOption(context);
        this.preview = new PreviewComponent(this.context.extensionUri);

        // initialize controller and subscribe the components to it
        this.controller = DocumentController.getInstance();
        this.controller.subscribe(this.preview, this.textEditor);

        // ----- Register commands ---->
        const toggleTextEditor = vscode.commands.registerCommand(
            `${JsonSchemaBuilderProvider.VIEWTYPE}.toggleTextEditor`,
            () => {
                if (!this.textEditor.isOpen) {
                    this.closePreview = false;
                }
                this.textEditor.toggle(this.controller.document);
            });
        const togglePreview = vscode.commands.registerCommand(
            `${this.preview.viewType}.togglePreview`,
            () => {
                this.preview.toggle(this.preview.viewType, this.controller.content);
            });

        this.context.subscriptions.push(togglePreview, toggleTextEditor);
        // <---- Register commands -----
    }

    /**
     * Called when a new custom editor is opened.
     * @param document Represents the data model (.form-file)
     * @param webviewPanel The panel which contains the webview
     * @param token A cancellation token that indicates that the result is no longer needed
     */
    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        token: vscode.CancellationToken
    ): Promise<void> {

        // Disable preview mode
        await vscode.commands.executeCommand('workbench.action.keepEditor');

        const disposables: vscode.Disposable[] = [];
        let isUpdateFromWebview = false;
        let isBuffer = false;

        await this.init(document);

        // Setup webview
        webviewPanel.webview.options = {enableScripts: true};
        webviewPanel.webview.html = getHtmlForWebview(
            webviewPanel.webview,
            this.context.extensionUri,
            //this.controller.content,
            'modeler'
        );

        // Send content from the extension to the webview
        // todo: change signature to (message: VscMessage)
        const postMessage = async (msgType: MessageType) => {
            //if (webviewPanel.visible) {
                let data: FormBuilderData | undefined;
                switch (msgType) {
                    case MessageType.initialize: {
                        data = this.controller.content;
                        break;
                    }
                    case MessageType.restore: {
                        data = (isBuffer) ? this.controller.content : undefined;
                        break;
                    }
                }

                try {
                    if (await webviewPanel.webview.postMessage({
                        type: `${JsonSchemaBuilderProvider.VIEWTYPE}.${msgType}`,
                        data,
                    })) {
                        if (msgType === MessageType.restore) {
                            isBuffer = false;
                        }
                    } else {
                        Logger.error("[Miranum.JsonForms]", `(Webview: ${webviewPanel.title})`, `Could not post message (Viewtype: ${webviewPanel.visible})`);
                    }
                } catch (error) {
                    if (!document.isClosed) {
                        const message = (error instanceof Error)
                            ? error.message
                            : `Could not post message to ${webviewPanel}`;
                        Logger.error("[Miranum.JsonForms]", `(Webview: ${webviewPanel.title})`, message);
                    }
                }
            //}
        }

        // Receive messages from the webview
        webviewPanel.webview.onDidReceiveMessage(async (event: VscMessage) => {
            try {
                switch (event.type) {
                    case `${JsonSchemaBuilderProvider.VIEWTYPE}.${MessageType.initialize}`: {
                        Logger.info("[Miranum.JsonForms.Webview]", `(Webview: ${webviewPanel.title})`, event.message ?? "");
                        postMessage(MessageType.initialize);
                        break;
                    }
                    case `${JsonSchemaBuilderProvider.VIEWTYPE}.${MessageType.restore}`: {
                        Logger.info("[Miranum.JsonForms.Webview]", `(Webview: ${webviewPanel.title})`, event.message ?? "");
                        postMessage(MessageType.restore);
                        break;
                    }
                    case `${JsonSchemaBuilderProvider.VIEWTYPE}.${MessageType.updateFromWebview}`: {
                        isUpdateFromWebview = true;
                        if (event.data) {
                            await this.controller.writeData(document.uri, event.data);
                        }
                        break;
                    }
                    case `${JsonSchemaBuilderProvider.VIEWTYPE}.confirmation`: {
                        vscode.window.showInformationMessage(
                            event.message ?? "Confirm",
                            ...['Yes', 'No']
                        ).then((input) => {
                            const response = (input === "Yes");
                            webviewPanel.webview.postMessage({
                                type: `${JsonSchemaBuilderProvider.VIEWTYPE}.confirmation`,
                                text: response
                            });
                        }, () => {
                            webviewPanel.webview.postMessage({
                                type: `${JsonSchemaBuilderProvider.VIEWTYPE}.confirmation`,
                                text: false
                            });
                        });
                        break;
                    }
                    case `${JsonSchemaBuilderProvider.VIEWTYPE}.${MessageType.info}`: {
                        Logger.info("[Miranum.JsonForms.Webview]", `(Webview: ${webviewPanel.title})`, event.message ?? "");
                        break;
                    }
                    case `${JsonSchemaBuilderProvider.VIEWTYPE}.${MessageType.error}`: {
                        Logger.error("[Miranum.JsonForms.Webview]", `(Webview: ${webviewPanel.title})`, event.message ?? "");
                        break;
                    }
                }
            } catch (error) {
                isUpdateFromWebview = false;
                const message = (error instanceof Error) ? error.message : `${error}`;
                Logger.error("[Miranum.JsonForms]", `(Webview: ${webviewPanel.title})`, message);
            }
        }, null, disposables);

        /**
         * When changes are made inside the webview a message to the extension will be sent with the new data.
         * This will also change the model (= document). If the model is changed the onDidChangeTextDocument event
         * will trigger and the SAME data would be sent back to the webview.
         * To prevent this we check from where the changes came from (webview or somewhere else).
         * If the changes are made inside the webview (this.isUpdateFromWebview === true) then we will send NO data
         * to the webview. For example if the changes are made inside a separate editor then the data will be sent to
         * the webview to synchronize it with the current content of the model.
         */
        vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString() &&
                e.contentChanges.length !== 0 && !isUpdateFromWebview) {

                if (!e.document.getText()) {
                    // e.g. when user deletes all lines in text editor
                    this.controller.writeData(e.document.uri, getMinimum());
                }

                // If the webview is in the background then no messages can be sent to it.
                // So we have to remember that we need to update its content the next time the webview regain its focus.
                if (!webviewPanel.visible) {
                    isBuffer = true;
                    return;
                }

                // Update the webviews content.
                switch (e.reason) {
                    case 1: {
                        postMessage(MessageType.undo);
                        break;
                    }
                    case 2: {
                        postMessage(MessageType.redo);
                        break;
                    }
                    case undefined: {
                        postMessage(MessageType.updateFromExtension);
                        break;
                    }
                }
            }
            isUpdateFromWebview = false;    // reset
        }, null, disposables);

        // Called when the view state changes (e.g. user switch the tab)
        webviewPanel.onDidChangeViewState((wp) => {
            try {
                switch (true) {
                    /* ------- Panel is active/visible ------- */
                    case wp.webviewPanel.active: {
                        this.controller.document = document;
                        if (!this.preview.isOpen && this.preview.lastViewState === ViewState.open) {
                            this.preview.create(this.preview.viewType, this.controller.content);
                        }

                        /* falls through */
                    }
                    case wp.webviewPanel.visible: {
                        // If changes has been made while the webview was not visible no messages could have been sent to the
                        // webview. So we have to update the webview if it gets its focus back.
                        if (isBuffer) {
                            postMessage(MessageType.updateFromExtension);
                            isBuffer = false;
                        }
                        break;
                    }
                    /* ------- Panel is NOT active/visible ------- */
                    case !wp.webviewPanel.active: {
                        if (!this.preview.active && this.closePreview) {
                            this.preview.close();
                        }
                        this.closePreview = true; // reset
                    }
                }
            } catch (error) {
                const message = (error instanceof Error) ? error.message : `${error}`;
                Logger.error("[Miranum.JsonForms]", `(Webview: ${wp.webviewPanel.title})`, message);
            }
        }, null, disposables);

        // CleanUp after Custom Editor was closed.
        webviewPanel.onDidDispose(() => {
            JsonSchemaBuilderProvider.counter--;
            vscode.commands.executeCommand('setContext', `${JsonSchemaBuilderProvider.VIEWTYPE}.openCustomEditors`, JsonSchemaBuilderProvider.counter);

            this.textEditor.close(this.controller.document.fileName);
            this.preview.close();

            this.dispose(document.uri.toString());
            webviewPanel.dispose();
        }, webviewPanel.title);

        this.disposables.set(document.uri.toString(), disposables);
    }

    /** @hidden */
    private async init(document: vscode.TextDocument) {
        // Necessary set up for toggle command
        // only enable the command if a custom editor is open
        JsonSchemaBuilderProvider.counter++;
        vscode.commands.executeCommand('setContext', `${JsonSchemaBuilderProvider.VIEWTYPE}.openCustomEditors`, JsonSchemaBuilderProvider.counter);

        // set the document
        try {
            await this.controller.setInitialDocument(document);

            // if we open a second editor beside one with an open preview window we have to close it and create a new one.
            if (this.preview.isOpen) {
                this.preview.close();
            }
            this.preview.create(this.preview.viewType, this.controller.content);

        } catch (error) {
            const message = (error instanceof Error) ? error.message : `${error}`;
            Logger.error("[Miranum.JsonForms]", `(${document.fileName})`, message);
        }

    }

    /** @hidden */
    private dispose(key: string): void {
        let disposables = this.disposables.get(key);
        if (disposables) {
            this.disposables.delete(key);
        } else {
            disposables = [];
        }

        while (disposables.length) {
            const item = disposables.pop();
            if (item) {
                item.dispose();
            }
        }
    }
}
