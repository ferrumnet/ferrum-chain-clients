import { ChainTransactionSigner, EcSignature } from "../types";
import { Injectable, JsonRpcClient, Network } from "ferrum-plumbing";
export declare class RemoteSignerClient implements ChainTransactionSigner, Injectable {
    private api;
    private network;
    static readonly DUMMY_PRIVATE_KEY = "DUMMY_PRIVATE_KEY";
    constructor(api: JsonRpcClient, network: Network);
    /**
     * Remotely signs a transaction.
     * @param address This is the signer address, not the private key
     * @param data Data to sign as Hex
     * @param forceLow Force low
     */
    sign(address: string, data: string, forceLow: boolean): Promise<EcSignature>;
    __name__(): string;
}
//# sourceMappingURL=RemoteSignerClient.d.ts.map