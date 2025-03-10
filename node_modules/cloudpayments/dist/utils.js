"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSignedString = exports.signString = void 0;
const crypto = require("crypto");
function signString(privateKey, data) {
    return crypto
        .createHmac("sha256", privateKey)
        .update(data)
        .digest("base64");
}
exports.signString = signString;
function checkSignedString(privateKey, signature, data) {
    return signString(privateKey, data) === signature;
}
exports.checkSignedString = checkSignedString;
//# sourceMappingURL=utils.js.map