"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptApi = void 0;
const assert_1 = require("assert");
const objectHash = require("object-hash");
const Client_1 = require("./Client");
const Api_1 = require("./Api");
class ReceiptApi extends Client_1.ClientRequestAbstract {
    getEndpoint() {
        return this.options.endpoint.replace(/\/$/, "").concat("/kkt");
    }
    /**
     * Create receipt
     *
     * @param {Receipt} request     Common request fields
     * @param {Receipt} receipt     Receipt fields
     * @param {string} requestId    Idempotent request id (calculated automatically if not provided)
     * @returns {Promise<Response>}
     */
    async createReceipt(request, receipt, requestId) {
        const { ..._request } = request;
        const { ..._receipt } = receipt;
        if (this.options.org) {
            if (!_request.Inn && this.options.org.inn) {
                _request.Inn = this.options.org.inn;
            }
            if (!_receipt.taxationSystem && Api_1.validateTaxationSystem(this.options.org.taxationSystem)) {
                _receipt.taxationSystem = this.options.org.taxationSystem;
            }
        }
        assert_1.ok(_request.Type, "Type is required");
        assert_1.ok(_request.Inn, "Inn is required");
        assert_1.ok(Api_1.validateTaxationSystem(_receipt.taxationSystem), "A receipt field taxationSystem should be valid");
        assert_1.ok(_receipt.Items && _receipt.Items.length > 0, "A receipt field Items should be filled");
        assert_1.ok(_receipt.Items.filter(x => !Api_1.validateVAT(x.vat)).length === 0, "You should fill VAT with valid values");
        const data = {
            ..._request,
            CustomerReceipt: _receipt,
        };
        return new Client_1.ClientResponse(await this.call("receipt", data, requestId || objectHash(receipt)));
    }
}
exports.ReceiptApi = ReceiptApi;
//# sourceMappingURL=ReceiptApi.js.map