import { PayloadType } from '../common/payload-type';
import { HttpRequest } from '../http-client/http-client';
import { Loggable } from '../logger/logger';
export declare abstract class SignProvider extends Loggable {
    abstract signRequestPayload(payload: PayloadType): PayloadType;
    protected abstract digestLine(line: string): string;
    protected abstract signLine(line: string): string;
    setFormType(request: HttpRequest): HttpRequest;
    protected compactParameters(payload: PayloadType): string;
    digest(payload: PayloadType): string;
    /**
     * Return sign by line. Check options to set up parameters
     * @param hash base64 encoded line
     */
    sign(hash: string): string;
}
