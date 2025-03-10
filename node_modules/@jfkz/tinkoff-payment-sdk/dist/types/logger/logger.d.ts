export declare enum SdkLogLevel {
    log = "log",
    info = "info",
    error = "error",
    warn = "warn",
    debug = "debug"
}
export interface SdkLogger {
    log?: (...args: unknown[]) => void;
    info?: (...args: unknown[]) => void;
    error?: (...args: unknown[]) => void;
    warn?: (...args: unknown[]) => void;
    debug?: (...args: unknown[]) => void;
}
export interface LoggableOptions {
    logger?: SdkLogger;
}
export declare class Loggable {
    private readonly _options;
    constructor(options?: LoggableOptions);
    protected log(level: SdkLogLevel, ...args: unknown[]): void;
}
