/** @see http://static2.tinkoff.ru/acquiring/manuals/merchant_api_protocoI_e2c.pdf */
import { BaseClient } from '../clients/base-client';
import { ResponsePayload as BaseResponsePayload } from '../response-payload';
export interface GetCustomerRequestPayload {
    /** Идентификатор покупателя в системе Продавца	*/
    CustomerKey: string;
    /** IP-адрес запроса */
    IP?: string;
}
export interface GetCustomerResponsePayload extends BaseResponsePayload {
    /** Идентификатор покупателя в системе Продавца	*/
    CustomerKey: string;
}
export declare function getCustomer(options: {
    apiClient: BaseClient;
    payload: GetCustomerRequestPayload;
}): Promise<GetCustomerResponsePayload>;
