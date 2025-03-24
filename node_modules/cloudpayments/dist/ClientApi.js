"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientApi = void 0;
const Client_1 = require("./Client");
class ClientApi extends Client_1.ClientRequestAbstract {
    /**
     * Charge cryptogram payment
     *
     * @param {CryptogramPaymentRequest} data
     * @returns {Promise<PaymentWith3DSClientResponse<PaymentWith3DSResponse>>}
     */
    async chargeCryptogramPayment(data) {
        return new Client_1.PaymentWith3DSClientResponse(await this.call("/payments/cards/charge", data));
    }
    /**
     * Authorize cryptogram payment
     *
     * @param {CryptogramPaymentRequest} data
     * @returns {Promise<PaymentWith3DSClientResponse<PaymentWith3DSResponse>>}
     */
    async authorizeCryptogramPayment(data) {
        return new Client_1.PaymentWith3DSClientResponse(await this.call("/payments/cards/auth", data));
    }
    /**
     * Charge token payment
     *
     * @param {TokenPaymentRequest} data
     * @returns {Promise<PaymentClientResponse<PaymentResponse>>}
     */
    async chargeTokenPayment(data) {
        return new Client_1.PaymentClientResponse(await this.call("/payments/tokens/charge", data));
    }
    /**
     * Authorize token payment
     *
     * @param {TokenPaymentRequest} data
     * @returns Promise<PaymentClientResponse<PaymentResponse>>
     */
    async authorizeTokenPayment(data) {
        return new Client_1.PaymentClientResponse(await this.call("/payments/tokens/auth", data));
    }
    /**
     * Confirm a 3DS payment
     *
     * @param {Confirm3DSRequest} data
     * @returns Promise<PaymentClientResponse<PaymentResponse>>
     */
    async confirm3DSPayment(data) {
        return new Client_1.PaymentClientResponse(await this.call("/payments/cards/post3ds", data));
    }
    /**
     * Confirm an authorized payment
     *
     * @param {ConfirmPaymentRequest} data
     * @returns {Promise<Response<BaseResponse>>}
     */
    async confirmPayment(data) {
        return new Client_1.ClientResponse(await this.call("/payments/confirm", data));
    }
    /**
     * Refund a payment
     *
     * @param {RefundPaymentRequest} data
     * @returns {Promise<Response<BaseResponse>>}
     */
    async refundPayment(data) {
        return new Client_1.ClientResponse(await this.call("/payments/refund", data));
    }
    /**
     * Void a payment
     *
     * @param {VoidPaymentRequest} data
     * @returns {Promise<Response<BaseResponse>>}
     */
    async voidPayment(data) {
        return new Client_1.ClientResponse(await this.call("/payments/void", data));
    }
    /**
     * Get a payment history
     *
     * @param {{TransactionId: number}} data
     * @returns {Promise<Response<PaymentGetResponse>>}
     */
    async getPayment(data) {
        return new Client_1.ClientResponse(await this.call("/payments/get", data));
    }
    /**
     * Find a payment by invoice id
     *
     * @param {{InvoiceId: string}} data
     * @returns Promise<PaymentClientResponse<PaymentResponse>>
     */
    async findPaymentByInvoiceId(data) {
        return new Client_1.PaymentClientResponse(await this.call("/payments/find", data));
    }
    /**
     * @deprecated see getPaymentsList
     *
     * @param {{Date: string | Date, TimeZone: string}} data
     * @returns {Promise<Response<PaymentHistoryResponse>>}
     */
    async getPaymentList(data) {
        return new Client_1.PaymentHistoryClientResponse(await this.call("/payments/list", data));
    }
    /**
     * Get a filtered payment list
     *
     * @param {{Date: string | Date, TimeZone: string}} data
     * @returns {Promise<Response<PaymentHistoryResponse>>}
     */
    async getPaymentsList(data) {
        return new Client_1.PaymentHistoryClientResponse(await this.call("/payments/list", data));
    }
    /**
     * Get a filtered payment list
     *
     * @param {LinkPaymentRequest} data
     * @returns {Promise<Response<LinkPaymentModel>>}
     */
    async createOrder(data) {
        return new Client_1.ClientResponse(await this.call("/orders/create", data));
    }
    /**
     * Create Subscription
     * @param data
     */
    async createSubscription(data) {
        return new Client_1.ClientResponse(await this.call("/subscriptions/create", data));
    }
    /**
     * Update Subscription
     * @param data
     */
    async updateSubscription(data) {
        return new Client_1.ClientResponse(await this.call("/subscriptions/update", data));
    }
    /**
     * Cancel Subscription
     * @param data
     */
    async cancelSubscription(data) {
        return new Client_1.ClientResponse(await this.call("/subscriptions/cancel", data));
    }
    /**
     * Get Subscription
     * @param data
     */
    async getSubscription(data) {
        return new Client_1.ClientResponse(await this.call("/subscriptions/get", data));
    }
    /**
     * Get Subscriptions List
     * @param data
     */
    async getSubscriptionsList(data) {
        return new Client_1.ClientResponse(await this.call("/subscriptions/find", data));
    }
    /**
     * Charge Cryptogram Payout
     *
     * @param {CryptogramPayoutRequest} data
     * @returns Promise<PayoutClientResponse<PayoutResponse>>
     */
    async chargeCryptogramPayout(data) {
        return new Client_1.PayoutClientResponse(await this.call("/payments/cards/topup", data));
    }
    /**
     * Charge token payout
     *
     * @param {TokenPayoutRequest} data
     * @returns Promise<PayoutClientResponse<PayoutResponse>>
     */
    async chargeTokenPayout(data) {
        return new Client_1.PayoutClientResponse(await this.call("/payments/token/topup ", data));
    }
}
exports.ClientApi = ClientApi;
//# sourceMappingURL=ClientApi.js.map