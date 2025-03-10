import { ClientOptions, ClientOptionsOrg } from "./ClientOptions";
export declare class ClientAbstract {
    protected options: ClientOptions & {
        endpoint: string;
    };
    constructor(_options: ClientOptions);
    getPublicId(): string;
    getEndpoint(): string;
    getOrgOptions(): ClientOptionsOrg | null;
}
