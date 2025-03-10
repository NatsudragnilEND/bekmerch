import { ResponsePayload as BaseResponsePayload } from '../response-payload';
export interface AddAccountQrRequestPayload {
    /** Подробное описание деталей заказа 	*/
    Description: string;
    /** Тип возвращаемых данных PAYLOAD – В ответе возвращается только Payload (по-умолчанию) IMAGE – В ответе возвращается SVG изображение QR */
    DataType?: 'PAYLOAD' | 'IMAGE';
    DATA?: any;
    RedirectDueDate?: Date;
}
export interface AddAccountQrResponsePayload extends BaseResponsePayload {
    /** Идентификатор запроса на привязку счета	*/
    RequestKey: string;
    Data: string;
}
export declare const addAccountQr: (options: {
    apiClient: import("../clients/base-client").BaseClient;
    payload: AddAccountQrRequestPayload;
}) => Promise<AddAccountQrResponsePayload>;
