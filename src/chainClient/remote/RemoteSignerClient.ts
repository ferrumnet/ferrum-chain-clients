import {ChainTransactionSigner, EcSignature} from "../types";
import {Injectable, JsonRpcClient, JsonRpcRequest, ValidationUtils} from "ferrum-plumbing";

export class RemoteSignerClient implements ChainTransactionSigner, Injectable {
    static readonly DUMMY_PRIVATE_KEY = 'DUMMY_PRIVATE_KEY';
    constructor(private api: JsonRpcClient) {}

    /**
     * Remotely signs a transaction.
     * @param skHex Must be empty string
     * @param data Data to sign as Hex
     * @param forceLow Force low
     */
    async sign(skHex: string, data: string, forceLow: boolean): Promise<EcSignature> {
        ValidationUtils.isTrue(!skHex || skHex === RemoteSignerClient.DUMMY_PRIVATE_KEY,
            'skHex must be empty. We are signing remotely');
        const res = await this.api.call({
            command: 'sign',
            params: [data, forceLow],
        } as JsonRpcRequest);
        return res.data as EcSignature;
    }

    __name__(): string { return 'RemoteSignerClient'; }
}