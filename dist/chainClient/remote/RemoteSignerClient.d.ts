import { EcSignature } from "../types";
import { Injectable, JsonRpcClient } from "ferrum-plumbing";
export declare class RemoteSignerClient implements Injectable {
    private api;
    static readonly DUMMY_PRIVATE_KEY = "DUMMY_PRIVATE_KEY";
    constructor(api: JsonRpcClient);
    /**
     * Remotely signs a transaction.
     * @param network The network
     * @param address This is the signer address, not the private key
     * @param data Data to sign as Hex
     * @param forceLow Force low
     */
    sign(network: string, address: string, data: string, forceLow: boolean): Promise<EcSignature>;
    __name__(): string;
}
//# sourceMappingURL=RemoteSignerClient.d.ts.map