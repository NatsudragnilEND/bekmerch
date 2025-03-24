"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentWith3DSClientResponse = void 0;
const PaymentClientResponse_1 = require("./PaymentClientResponse");
const ClientResponse_1 = require("../ClientResponse");
class PaymentWith3DSClientResponse extends PaymentClientResponse_1.PaymentClientResponse {
    isPayment3DSResponse() {
        const { Model } = this.getResponse();
        return !this.isSuccess() && ClientResponse_1.ClientResponse.has(["TransactionId", "PaReq", "AcsUrl"], Model);
    }
}
exports.PaymentWith3DSClientResponse = PaymentWith3DSClientResponse;
//# sourceMappingURL=PaymentWith3DSClientResponse.js.map