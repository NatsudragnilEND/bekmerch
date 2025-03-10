import { Schema } from './schema';
export declare function serializeData<DataType extends {}>(options: {
    data: DataType;
    schema: Schema;
    ignoreMissing?: boolean;
}): DataType;
