import Request from 'request-promise-native';
import { HttpClient, HttpRequest, HttpResponse } from './http-client';
export interface RequestHttpClientOptions {
    request: typeof Request;
}
/**
 * An HTTP client implementation adapter using Request HTTP client.
 */
export declare class RequestHttpClient implements HttpClient {
    private options;
    constructor(options: RequestHttpClientOptions);
    sendRequest<ResponsePayloadType>(options: HttpRequest): Promise<HttpResponse<ResponsePayloadType>>;
}
