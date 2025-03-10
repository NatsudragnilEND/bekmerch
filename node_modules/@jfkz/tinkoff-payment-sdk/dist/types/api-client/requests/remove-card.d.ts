/** @see http://static2.tinkoff.ru/acquiring/manuals/merchant_api_protocoI_e2c.pdf */
import { BaseClient } from '../clients/base-client';
import { ResponsePayload as BaseResponsePayload } from '../response-payload';
export interface RemoveCardRequestPayload {
    /** Идентификатор покупателя в системе Продавца	*/
    CustomerKey: string;
    /** Идентификатор карты в системе Банка */
    CardId: number;
    /** IP-адрес запроса */
    IP?: string;
}
export interface RemoveCardResponsePayload extends BaseResponsePayload {
    /** Идентификатор покупателя в системе Продавца	*/
    CustomerKey: string;
}
export declare function removeCard(options: {
    apiClient: BaseClient;
    payload: RemoveCardRequestPayload;
}): Promise<RemoveCardResponsePayload>;
