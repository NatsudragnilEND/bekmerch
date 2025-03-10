import { ResponsePayload as BaseResponsePayload } from '../response-payload';
export interface ChargeQrRequestPayload {
    /** Уникальный идентификатор транзакции в системе Банка */
    PaymentId: number;
    /** Идентификатор привязки счета, назначаемый Банком Плательщика */
    AccountToken: string;
    /** IP-адрес клиента */
    IP?: string;
    /** true – если покупатель хочет получать уведомления на почту */
    SendEmail?: boolean;
    /** Адрес почты покупателя */
    InfoEmail?: string;
}
export interface ChargeQrResponsePayload extends BaseResponsePayload {
    /** Номер заказа в системе Продавца	*/
    OrderId: string;
    Amount: number;
    /** Код валюты ISO 421. */
    Currency: number;
    /** Уникальный идентификатор транзакции в системе Банка */
    PaymentId: number;
}
export declare const chargeQr: (options: {
    apiClient: import("../clients/base-client").BaseClient;
    payload: ChargeQrRequestPayload;
}) => Promise<ChargeQrResponsePayload>;
