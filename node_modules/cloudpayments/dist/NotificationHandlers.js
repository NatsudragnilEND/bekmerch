"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationHandlers = void 0;
const Client_1 = require("./Client");
const qs = require("qs");
const utils_1 = require("./utils");
const url_1 = require("url");
const assert_1 = require("assert");
class NotificationHandlers extends Client_1.ClientAbstract {
    async handleCheckRequest(req, validator) {
        return this.handle(req, validator);
    }
    async handlePayRequest(req, validator) {
        return this.handle(req, validator);
    }
    async handleConfirmRequest(req, validator) {
        return this.handle(req, validator);
    }
    async handleFailRequest(req, validator) {
        return this.handle(req, validator);
    }
    async handleRefundRequest(req, validator) {
        return this.handle(req, validator);
    }
    async handleRecurrentRequest(req, validator) {
        return this.handle(req, validator);
    }
    async handleReceiptRequest(req, validator) {
        return this.handle(req, validator);
    }
    async handle(req, validator) {
        try {
            const request = "payload" in req ? await this.checkPayload(req) : await this.parseRequest(req);
            if (validator) {
                const code = await validator(request);
                return { request, response: { code } };
            }
            return { request, response: {} };
        }
        catch (error) {
            throw error;
        }
    }
    async checkPayload(req) {
        let signature = "";
        if (req.headers && !req.signature) {
            assert_1.ok("content-hmac" in req.headers, "Request headers should contain Content-HMAC field.");
            signature = req.headers["content-hmac"];
        }
        if (req.signature) {
            signature = req.signature;
        }
        const payload = typeof req.payload === "string" ? req.payload : JSON.stringify(req.payload);
        assert_1.ok(signature, "Custom payload should provide signature or header key.");
        assert_1.ok(utils_1.checkSignedString(this.options.privateKey, signature, payload), "Invalid signature");
        return req.payload;
    }
    async parseRequest(req) {
        assert_1.ok("content-hmac" in req.headers, "Request headers should contain Content-HMAC field.");
        const signature = req.headers["content-hmac"];
        const method = (req.method || "").toUpperCase();
        assert_1.ok(["GET", "POST"].includes(method), "Request method should be GET or POST");
        if (method === "POST") {
            let chunksLength = 0;
            const chunks = [];
            const body = await new Promise((resolve, reject) => {
                req.on("data", (chunk) => {
                    chunks.push(chunk);
                    chunksLength += chunk.length;
                });
                req.on("end", () => resolve(Buffer.concat(chunks, chunksLength).toString("utf-8")));
                req.on("error", reject);
            });
            const headers = req.headers || {};
            assert_1.ok(utils_1.checkSignedString(this.options.privateKey, signature, body), "Invalid signature");
            if (typeof headers["content-type"] === "string" && headers["content-type"].indexOf("json") !== -1) {
                return JSON.parse(body);
            }
            else {
                return qs.parse(body);
            }
        }
        assert_1.ok(utils_1.checkSignedString(this.options.privateKey, signature, url_1.parse(req.url || "").query || ""), "Invalid signature");
        return url_1.parse(req.url || "", true).query;
    }
}
exports.NotificationHandlers = NotificationHandlers;
//# sourceMappingURL=NotificationHandlers.js.map