import { Payment3DSResponse, PaymentSuccessResponse, PaymentWith3DSResponse } from "../../Api";
import { PaymentClientResponse } from "./PaymentClientResponse";
export declare class PaymentWith3DSClientResponse<T extends PaymentWith3DSResponse> extends PaymentClientResponse<T> {
    readonly isPaymentSuccessResponse: () => this is PaymentWith3DSClientResponse<PaymentSuccessResponse>;
    isPayment3DSResponse(): this is PaymentWith3DSClientResponse<Payment3DSResponse>;
}
