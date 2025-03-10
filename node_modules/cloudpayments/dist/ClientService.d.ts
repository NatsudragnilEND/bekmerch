import { ClientAbstract, ClientOptions } from "./Client";
import { ClientApi } from "./ClientApi";
import { ReceiptApi } from "./ReceiptApi";
import { NotificationHandlers } from "./NotificationHandlers";
export declare class ClientService extends ClientAbstract {
    protected client: ClientApi;
    protected receipt: ReceiptApi;
    protected handlers: NotificationHandlers;
    constructor(options: ClientOptions);
    static createClientApi(options: ClientOptions): ClientApi;
    static createReceiptApi(options: ClientOptions): ReceiptApi;
    static createNotificationHandlers(options: ClientOptions): NotificationHandlers;
    getClientApi(): ClientApi;
    getNotificationHandlers(): NotificationHandlers;
    getReceiptApi(): ReceiptApi;
}
