import { ClientResponse } from "../ClientResponse";
import { HistoryPaymentModel, PaymentHistoryResponse, PaymentSuccessModel } from "../../Api";
export declare class PaymentHistoryClientResponse<T extends PaymentHistoryResponse> extends ClientResponse<T> {
    getSuccessPayments(): PaymentSuccessModel[];
    getFailPayments(): HistoryPaymentModel[];
    getPayments(): HistoryPaymentModel[];
}
