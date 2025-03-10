import { ApiClient } from '../clients/api-client';
import { ResponsePayload as BaseResponsePayload } from '../response-payload';
/** @see https://oplata.tinkoff.ru/develop/api/payments/charge-request/ */
export interface ChargePaymentRequestPayload {
    /** Идентификатор платежа в системе банка	*/
    PaymentId: number;
    /** Идентификатор автоплатежа	*/
    RebillId: number;
    /** Получение покупателем уведомлений на электронную почту */
    SendEmail?: boolean;
    /** Электронная почта покупателя */
    InfoEmail?: string;
    /** IP-адрес покупателя	*/
    IP?: string;
    /** https://oplata.tinkoff.ru/develop/api/request-sign/ */
    Token?: string;
}
/** https://oplata.tinkoff.ru/develop/api/autopayments/charge-response/ */
export interface ChargePaymentResponsePayload extends BaseResponsePayload {
    /** Сумма в копейках */
    Amount: number;
    /** Идентификатор заказа в системе продавца	*/
    OrderId: string;
    /** Уникальный идентификатор транзакции в системе банка	*/
    PaymentId: number;
    /** Идентификатор для безопасной сделки */
    SpAccumulationId?: string;
}
export declare function chargePayment(options: {
    apiClient: ApiClient;
    payload: ChargePaymentRequestPayload;
}): Promise<ChargePaymentResponsePayload>;
