"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientResponse = void 0;
class ClientResponse {
    constructor(response) {
        this.response = response;
    }
    getResponse() {
        return this.response;
    }
    isSuccess() {
        return this.response.Success;
    }
    getMessage() {
        return this.response.Message;
    }
    static has(key, object) {
        if (typeof object !== "object" || object === null) {
            return false;
        }
        if (Array.isArray(key)) {
            return key.every(k => Reflect.has(object, k));
        }
        return Reflect.has(object, key);
    }
}
exports.ClientResponse = ClientResponse;
//# sourceMappingURL=ClientResponse.js.map