import { PayoutResponse, PayoutSuccessResponse } from "../../Api";
import { ClientResponse } from "../ClientResponse";
export declare class PayoutClientResponse<T extends PayoutResponse> extends ClientResponse<T> {
    isPayoutSuccessResponse(): this is ClientResponse<PayoutSuccessResponse>;
}
