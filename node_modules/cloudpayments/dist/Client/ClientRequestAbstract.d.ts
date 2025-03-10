import fetch from "node-fetch";
import { ClientResponse } from "./ClientResponse";
import { BaseResponse } from "../Api";
import { ClientAbstract } from "./ClientAbstract";
export declare class ClientRequestAbstract extends ClientAbstract {
    /**
     * HTTP Client
     *
     * @returns {(url: (string | Request), init?: RequestInit) => Promise<Response>}
     */
    get client(): typeof fetch;
    /**
     *
     */
    ping(): Promise<ClientResponse<BaseResponse>>;
    /**
     * Create request to an API endpoint.
     *
     * @param {string} url
     * @param {Object} data
     * @param {string} requestId
     * @returns {Promise<ClientResponse<BaseResponse>>}
     */
    protected call<R extends BaseResponse>(url: string, data?: object, requestId?: string): Promise<R>;
}
