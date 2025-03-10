"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flatDataObject = void 0;
function flatDataObject(data) {
    if (typeof data === 'string') {
        return data;
    }
    const lines = [];
    for (const key in data) {
        lines.push(`${key}=${data[key]}`);
    }
    return lines.join('&');
}
exports.flatDataObject = flatDataObject;
//# sourceMappingURL=data.js.map