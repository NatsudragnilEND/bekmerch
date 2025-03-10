import { ResponsePayload as BaseResponsePayload } from '../response-payload';
export interface Member {
    MemberId: string;
    MemberName: string;
    IsPayee: boolean;
}
export interface QrMembersListRequestPayload {
    /** Уникальный идентификатор транзакции в системе Банка */
    PaymentId: number;
}
export interface QrMembersListResponsePayload extends BaseResponsePayload {
    OrderId: string;
    Members?: Member[];
}
export declare const getQrMembersList: (options: {
    apiClient: import("../clients/base-client").BaseClient;
    payload: QrMembersListRequestPayload;
}) => Promise<QrMembersListResponsePayload>;
