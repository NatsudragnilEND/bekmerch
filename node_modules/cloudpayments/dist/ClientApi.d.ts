import { ClientRequestAbstract, ClientResponse, PaymentClientResponse, PaymentHistoryClientResponse, PaymentWith3DSClientResponse, PayoutClientResponse } from "./Client";
import { BaseRequest, BaseResponse, Confirm3DSRequest, ConfirmPaymentRequest, CryptogramPaymentRequest, CryptogramPayoutRequest, LinkPaymentRequest, PaymentGetResponse, PaymentHistoryResponse, PaymentResponse, PaymentWith3DSResponse, PayoutResponse, RefundPaymentRequest, SubscriptionCreateRequest, SubscriptionResponse, SubscriptionsListGetResponse, SubscriptionUpdateRequest, TokenPaymentRequest, TokenPayoutRequest, VoidPaymentRequest } from "./Api";
export declare class ClientApi extends ClientRequestAbstract {
    /**
     * Charge cryptogram payment
     *
     * @param {CryptogramPaymentRequest} data
     * @returns {Promise<PaymentWith3DSClientResponse<PaymentWith3DSResponse>>}
     */
    chargeCryptogramPayment(data: CryptogramPaymentRequest): Promise<PaymentWith3DSClientResponse<PaymentWith3DSResponse>>;
    /**
     * Authorize cryptogram payment
     *
     * @param {CryptogramPaymentRequest} data
     * @returns {Promise<PaymentWith3DSClientResponse<PaymentWith3DSResponse>>}
     */
    authorizeCryptogramPayment(data: CryptogramPaymentRequest): Promise<PaymentWith3DSClientResponse<PaymentWith3DSResponse>>;
    /**
     * Charge token payment
     *
     * @param {TokenPaymentRequest} data
     * @returns {Promise<PaymentClientResponse<PaymentResponse>>}
     */
    chargeTokenPayment(data: TokenPaymentRequest): Promise<PaymentClientResponse<PaymentResponse>>;
    /**
     * Authorize token payment
     *
     * @param {TokenPaymentRequest} data
     * @returns Promise<PaymentClientResponse<PaymentResponse>>
     */
    authorizeTokenPayment(data: TokenPaymentRequest): Promise<PaymentClientResponse<PaymentResponse>>;
    /**
     * Confirm a 3DS payment
     *
     * @param {Confirm3DSRequest} data
     * @returns Promise<PaymentClientResponse<PaymentResponse>>
     */
    confirm3DSPayment(data: Confirm3DSRequest): Promise<PaymentClientResponse<PaymentResponse>>;
    /**
     * Confirm an authorized payment
     *
     * @param {ConfirmPaymentRequest} data
     * @returns {Promise<Response<BaseResponse>>}
     */
    confirmPayment(data: ConfirmPaymentRequest): Promise<ClientResponse<BaseResponse>>;
    /**
     * Refund a payment
     *
     * @param {RefundPaymentRequest} data
     * @returns {Promise<Response<BaseResponse>>}
     */
    refundPayment(data: RefundPaymentRequest): Promise<ClientResponse<BaseResponse>>;
    /**
     * Void a payment
     *
     * @param {VoidPaymentRequest} data
     * @returns {Promise<Response<BaseResponse>>}
     */
    voidPayment(data: VoidPaymentRequest): Promise<ClientResponse<BaseResponse>>;
    /**
     * Get a payment history
     *
     * @param {{TransactionId: number}} data
     * @returns {Promise<Response<PaymentGetResponse>>}
     */
    getPayment(data: BaseRequest & {
        TransactionId: number;
    }): Promise<ClientResponse<PaymentGetResponse>>;
    /**
     * Find a payment by invoice id
     *
     * @param {{InvoiceId: string}} data
     * @returns Promise<PaymentClientResponse<PaymentResponse>>
     */
    findPaymentByInvoiceId(data: BaseRequest & {
        InvoiceId: string;
    }): Promise<PaymentClientResponse<PaymentResponse>>;
    /**
     * @deprecated see getPaymentsList
     *
     * @param {{Date: string | Date, TimeZone: string}} data
     * @returns {Promise<Response<PaymentHistoryResponse>>}
     */
    getPaymentList(data: BaseRequest & {
        Date: string | Date;
        TimeZone?: string;
    }): Promise<PaymentHistoryClientResponse<PaymentHistoryResponse>>;
    /**
     * Get a filtered payment list
     *
     * @param {{Date: string | Date, TimeZone: string}} data
     * @returns {Promise<Response<PaymentHistoryResponse>>}
     */
    getPaymentsList(data: BaseRequest & {
        Date: string | Date;
        TimeZone?: string;
    }): Promise<PaymentHistoryClientResponse<PaymentHistoryResponse>>;
    /**
     * Get a filtered payment list
     *
     * @param {LinkPaymentRequest} data
     * @returns {Promise<Response<LinkPaymentModel>>}
     */
    createOrder(data: LinkPaymentRequest): Promise<ClientResponse<BaseResponse>>;
    /**
     * Create Subscription
     * @param data
     */
    createSubscription(data: BaseRequest & SubscriptionCreateRequest): Promise<ClientResponse<SubscriptionResponse>>;
    /**
     * Update Subscription
     * @param data
     */
    updateSubscription(data: BaseRequest & SubscriptionUpdateRequest): Promise<ClientResponse<SubscriptionResponse>>;
    /**
     * Cancel Subscription
     * @param data
     */
    cancelSubscription(data: BaseRequest & SubscriptionUpdateRequest): Promise<ClientResponse<BaseResponse>>;
    /**
     * Get Subscription
     * @param data
     */
    getSubscription(data: BaseRequest & {
        Id: string;
    }): Promise<ClientResponse<SubscriptionResponse>>;
    /**
     * Get Subscriptions List
     * @param data
     */
    getSubscriptionsList(data: BaseRequest & {
        accountId: string;
    }): Promise<ClientResponse<SubscriptionsListGetResponse>>;
    /**
     * Charge Cryptogram Payout
     *
     * @param {CryptogramPayoutRequest} data
     * @returns Promise<PayoutClientResponse<PayoutResponse>>
     */
    chargeCryptogramPayout(data: CryptogramPayoutRequest): Promise<PayoutClientResponse<PayoutResponse>>;
    /**
     * Charge token payout
     *
     * @param {TokenPayoutRequest} data
     * @returns Promise<PayoutClientResponse<PayoutResponse>>
     */
    chargeTokenPayout(data: TokenPayoutRequest): Promise<PayoutClientResponse<PayoutResponse>>;
}
