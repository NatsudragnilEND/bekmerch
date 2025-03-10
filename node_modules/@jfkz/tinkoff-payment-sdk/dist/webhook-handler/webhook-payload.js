"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookPayloadSchema = void 0;
const schema_1 = require("../serialization/schema");
exports.webhookPayloadSchema = [
    {
        property: 'PaymentId',
        type: schema_1.SchemaPropertyType.IntegerFromString,
    },
    {
        property: 'Amount',
        type: schema_1.SchemaPropertyType.IntegerFromString,
    },
    {
        property: 'Rebilld',
        type: schema_1.SchemaPropertyType.IntegerFromString,
        optional: true,
    },
    {
        property: 'CardId',
        type: schema_1.SchemaPropertyType.IntegerFromString,
        optional: true,
    },
    {
        property: 'Amount',
        type: schema_1.SchemaPropertyType.MoneyFromPenny,
    },
];
//# sourceMappingURL=webhook-payload.js.map