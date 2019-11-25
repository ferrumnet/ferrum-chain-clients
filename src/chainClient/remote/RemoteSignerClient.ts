import {ChainTransactionSigner, EcSignature} from "../types";
import {Injectable, JsonRpcClient, JsonRpcRequest, Network, ValidationUtils} from "ferrum-plumbing";

export class RemoteSignerClient implements ChainTransactionSigner, Injectable {
    static readonly DUMMY_PRIVATE_KEY = 'DUMMY_PRIVATE_KEY';
    constructor(private api: JsonRpcClient, private network: Network) {}

    /**
     * Remotely signs a transaction.
     * @param address This is the signer address, not the private key
     * @param data Data to sign as Hex
     * @param forceLow Force low
     */
    async sign(address: string, data: string, forceLow: boolean): Promise<EcSignature> {
        ValidationUtils.isTrue(!!address,
            '"address" must be provided');
        // ValidationUtils.isTrue(!skHex || skHex === RemoteSignerClient.DUMMY_PRIVATE_KEY,
        //     'skHex must be empty. We are signing remotely');
        const res = await this.api.call({
            command: 'sign',
            params: [this.network, address, data, forceLow],
        } as JsonRpcRequest);
        return res.data as EcSignature;
    }

    __name__(): string { return 'RemoteSignerClient'; }
}