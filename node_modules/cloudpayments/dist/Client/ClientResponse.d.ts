import { BaseResponse } from "../Api";
export declare class ClientResponse<T extends BaseResponse> {
    protected readonly response: T;
    constructor(response: T);
    getResponse(): T;
    isSuccess(): boolean;
    getMessage(): string | null;
    protected static has(key: string | string[], object: object | null): boolean;
}
