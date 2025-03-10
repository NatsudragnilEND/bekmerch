export interface PayloadWithMessage {
    Message?: string;
    [key: string]: any;
}
export declare class SdkError extends Error {
    payload?: PayloadWithMessage;
    constructor(options: {
        payload?: PayloadWithMessage;
        message?: string;
    });
}
