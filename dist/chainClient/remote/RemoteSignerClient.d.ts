import { ChainTransactionSigner, EcSignature } from "../types";
import { Injectable, JsonRpcClient } from "ferrum-plumbing";
export declare class RemoteSignerClient implements ChainTransactionSigner, Injectable {
    private api;
    static readonly DUMMY_PRIVATE_KEY = "DUMMY_PRIVATE_KEY";
    constructor(api: JsonRpcClient);
    /**
     * Remotely signs a transaction.
     * @param skHex Must be empty string
     * @param data Data to sign as Hex
     * @param forceLow Force low
     */
    sign(skHex: string, data: string, forceLow: boolean): Promise<EcSignature>;
    __name__(): string;
}
//# sourceMappingURL=RemoteSignerClient.d.ts.map