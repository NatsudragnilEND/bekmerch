"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentHistoryClientResponse = void 0;
const ClientResponse_1 = require("../ClientResponse");
const PaymentClientResponse_1 = require("./PaymentClientResponse");
class PaymentHistoryClientResponse extends ClientResponse_1.ClientResponse {
    getSuccessPayments() {
        return this.getPayments().filter(PaymentClientResponse_1.PaymentClientResponse.isPaymentSuccessResponse);
    }
    getFailPayments() {
        return this.getPayments().filter((data) => !PaymentClientResponse_1.PaymentClientResponse.isPaymentSuccessResponse(data));
    }
    getPayments() {
        if (this.isSuccess()) {
            const { Model = [] } = this.getResponse();
            return Model;
        }
        return [];
    }
}
exports.PaymentHistoryClientResponse = PaymentHistoryClientResponse;
//# sourceMappingURL=PaymentHistoryClientResponse.js.map