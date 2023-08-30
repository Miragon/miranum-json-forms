import { VscMessage, VscState } from "../../../shared/types";
import { FormBuilderData } from "../../../utils";

export interface VsCode {
    getState(): VscState<FormBuilderData> | undefined;

    setState(state: VscState<FormBuilderData>): void;

    updateState(state: VscState<FormBuilderData>): void;

    postMessage(message: VscMessage<FormBuilderData>): void;
}
