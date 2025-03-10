"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SdkError = void 0;
const defaultMessage = 'Tinkoff Payment SDK error';
class SdkError extends Error {
    constructor(options) {
        const { payload, message = defaultMessage } = options;
        super((payload === null || payload === void 0 ? void 0 : payload.Message) || message);
        if (payload) {
            this.payload = payload;
        }
    }
}
exports.SdkError = SdkError;
//# sourceMappingURL=sdk-error.js.map