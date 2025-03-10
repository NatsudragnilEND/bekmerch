import { ApiClient } from '../clients/api-client';
import { ResponsePayload as BaseResponsePayload } from '../response-payload';
/** @see http://static2.tinkoff.ru/acquiring/manuals/merchant_api_protocoI_e2c.pdf */
export interface PaymentRequestPayload {
    /** Идентификатор платежа в системе банка	*/
    PaymentId: number;
}
/** http://static2.tinkoff.ru/acquiring/manuals/merchant_api_protocoI_e2c.pdf */
export interface PaymentResponsePayload extends BaseResponsePayload {
    /** Идентификатор заказа в системе продавца	*/
    OrderId: string;
    /** Уникальный идентификатор транзакции в системе банка	*/
    PaymentId: number;
}
export declare function payment(options: {
    apiClient: ApiClient;
    payload: PaymentRequestPayload;
}): Promise<PaymentResponsePayload>;
