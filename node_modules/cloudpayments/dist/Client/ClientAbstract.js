"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientAbstract = void 0;
class ClientAbstract {
    constructor(_options) {
        this.options = {
            endpoint: "https://api.cloudpayments.ru",
            ..._options,
        };
    }
    getPublicId() {
        return this.options.publicId;
    }
    getEndpoint() {
        return this.options.endpoint;
    }
    getOrgOptions() {
        if (this.options.org) {
            return this.options.org;
        }
        return null;
    }
}
exports.ClientAbstract = ClientAbstract;
//# sourceMappingURL=ClientAbstract.js.map