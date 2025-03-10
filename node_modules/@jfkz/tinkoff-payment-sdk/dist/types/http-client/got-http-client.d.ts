import Got from 'got';
import { HttpClient, HttpRequest, HttpResponse } from './http-client';
export interface GotHttpClientOptions {
    got: typeof Got;
}
/**
 * An HTTP client implementation adapter using Got HTTP client.
 *
 * The user will need to provide a Got instance,
 * which could be pre-configured with custom options
 * (e.g. timeout, retries, etc).
 */
export declare class GotHttpClient implements HttpClient {
    private options;
    constructor(options: GotHttpClientOptions);
    sendRequest<ResponsePayloadType>(options: HttpRequest): Promise<HttpResponse<ResponsePayloadType>>;
}
