"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payment = void 0;
const http_client_1 = require("../../http-client/http-client");
const PaymentRequestSchema = [];
const PaymentResponseSchema = [];
//==========//
// FUNCTION //
//==========//
async function payment(options) {
    const { apiClient } = options;
    const $payload = Object.assign({}, options.payload);
    const response = await apiClient.sendRequest({
        request: {
            url: 'Payment',
            method: http_client_1.HttpRequestMethod.POST,
            payload: $payload,
        },
        requestSchema: PaymentRequestSchema,
        responseSchema: PaymentResponseSchema,
    });
    return response.payload;
}
exports.payment = payment;
//# sourceMappingURL=payment.js.map