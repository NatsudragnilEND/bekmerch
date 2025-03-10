import { ResponsePayload as BaseResponsePayload } from '../response-payload';
export interface CreateSpDealRequestPayload {
    /** Тип сделки (N1/1N) */
    SpDealType: 'N1' | '1N';
}
export interface CreateSpDealResponsePayload extends BaseResponsePayload {
    /** Идентификатор сделки	*/
    SpAccumulationId: string;
}
export declare const CreateSpDeal: (options: {
    apiClient: import("../clients/base-client").BaseClient;
    payload: CreateSpDealRequestPayload;
}) => Promise<CreateSpDealResponsePayload>;
