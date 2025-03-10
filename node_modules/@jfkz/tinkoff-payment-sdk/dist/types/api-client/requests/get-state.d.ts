/** @see http://static2.tinkoff.ru/acquiring/manuals/merchant_api_protocoI_e2c.pdf */
import { BaseClient } from '../clients/base-client';
import { ResponsePayload as BaseResponsePayload } from '../response-payload';
export interface GetStateRequestPayload {
    /** PaymentId покупателя в системе Продавца	*/
    PaymentId: string;
    /** IP-адрес запроса */
    IP?: string;
}
export interface GetStateResponsePayload extends BaseResponsePayload {
    /** Уникальный номер заказа в системе Продавца	*/
    OrderId: string;
    /** Сумма отмены в копейках. */
    Amount?: number;
}
export declare function getState(options: {
    apiClient: BaseClient;
    payload: GetStateRequestPayload;
}): Promise<GetStateResponsePayload>;
