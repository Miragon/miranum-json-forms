import { isArray, mergeWith, reverse, uniqBy } from "lodash";
import { WebviewApi } from "vscode-webview";
import { FormBuilderData } from "../../../utils";
import { VscMessage, VscState } from "../../../shared/types";

export class StateController {
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

    public updateState(state: Subset<VscState<FormBuilderData>>) {
        function customizer(objValue: any, srcValue: any): any {
            if (isArray(objValue)) {
                return reverse(uniqBy(reverse(objValue.concat(srcValue)), "type"));
            }
        }

        const newState = mergeWith(this.getState(), state, customizer);
        this.setState({
            ...newState,
        });
    }

    public postMessage(message: VscMessage<FormBuilderData>) {
        this.vscode.postMessage(message);
    }
}

type Subset<K> = {
    [attr in keyof K]?: K[attr] extends object ? Subset<K[attr]> : K[attr];
};
