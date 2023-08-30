import { VsCode } from "@/composables/types";
import { MessageType, VscMessage, VscState } from "../../../shared/types";
import { FormBuilderData } from "../../../utils";

declare const globalViewType: string;

/**
 * To simplify the development of the webview, we allow it to run in the browser.
 * For this purpose, the functionality of the extension/backend is mocked.
 */
export class MockedStateController implements VsCode {
    public getState(): VscState<FormBuilderData> | undefined {
        return undefined;
    }

    public async postMessage(message: VscMessage<FormBuilderData>): Promise<void> {
        const { type, data, logger } = message;
        switch (type) {
            case `${globalViewType}.${MessageType.initialize}`: {
                console.log("[Log]", MessageType.initialize, logger);
                window.dispatchEvent(
                    new MessageEvent("message", {
                        data: {
                            type: `${globalViewType}.${MessageType.initialize}`,
                            data: initialData,
                        },
                    }),
                );
                break;
            }
            case `${globalViewType}.${MessageType.msgFromWebview}`: {
                console.log("[Log]", MessageType.msgFromWebview, logger);
                break;
            }
            case `${globalViewType}.${MessageType.error}`: {
                console.error("[Log]", MessageType.error, logger);
                break;
            }
            case `${globalViewType}.${MessageType.info}`: {
                console.log("[Log]", MessageType.info, logger);
                break;
            }
        }
    }

    public setState(state: VscState<FormBuilderData>): void {
        console.log("[Log] setState()", state);
    }

    public updateState(state: VscState<FormBuilderData>): void {
        console.log("[Log] updateState()", state);
    }
}

const initialData: FormBuilderData = {
    schema: {
        type: "object",
        properties: {},
    },
    uischema: {
        type: "VerticalLayout",
        elements: [],
    },
};
