import { WebviewApi } from "vscode-webview";
import { VsCode } from "@/composables/types";
import { FormBuilderData } from "../../../utils";
import { VscMessage, VscState } from "../../../shared/types";

export class StateController implements VsCode {
    private vscode: WebviewApi<VscState<FormBuilderData>>;

    constructor() {
        this.vscode = acquireVsCodeApi();
    }

    public getState(): VscState<FormBuilderData> | undefined {
        return this.vscode.getState();
    }

    public setState(state: VscState<FormBuilderData>) {
        this.vscode.setState(state);
    }

    public updateState(state: VscState<FormBuilderData>) {
        this.setState({
            ...state,
        });
    }

    public postMessage(message: VscMessage<FormBuilderData>) {
        this.vscode.postMessage(message);
    }
}
