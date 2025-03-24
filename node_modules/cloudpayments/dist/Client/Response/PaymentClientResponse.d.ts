import { PaymentFailedResponse, PaymentModel, PaymentResponse, PaymentSuccessModel, PaymentSuccessResponse, PaymentWith3DSResponse } from "../../Api";
import { ClientResponse } from "../ClientResponse";
export declare class PaymentClientResponse<T extends PaymentResponse | PaymentWith3DSResponse = PaymentFailedResponse> extends ClientResponse<T> {
    isPaymentSuccessResponse(): this is PaymentClientResponse<PaymentSuccessResponse>;
    static isPaymentSuccessResponse(data: PaymentModel | PaymentSuccessModel): data is PaymentSuccessModel;
}
