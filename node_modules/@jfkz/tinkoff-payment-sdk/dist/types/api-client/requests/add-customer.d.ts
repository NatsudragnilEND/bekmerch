/** @see http://static2.tinkoff.ru/acquiring/manuals/merchant_api_protocoI_e2c.pdf */
import { BaseClient } from '../clients/base-client';
import { ResponsePayload as BaseResponsePayload } from '../response-payload';
export interface AddCustomerRequestPayload {
    /** Идентификатор покупателя в системе Продавца	*/
    CustomerKey: string;
    /** IP-адрес запроса */
    IP?: string;
    /** Email клиента */
    Email?: string;
    /** Телефон клиента (+71234567890) */
    Phone?: string;
}
export interface AddCustomerResponsePayload extends BaseResponsePayload {
    /** Идентификатор покупателя в системе Продавца	*/
    CustomerKey: string;
}
export declare function addCustomer(options: {
    apiClient: BaseClient;
    payload: AddCustomerRequestPayload;
}): Promise<AddCustomerResponsePayload>;
