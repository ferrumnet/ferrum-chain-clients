import {EcSignature} from "../types";
import {Injectable, JsonRpcClient, JsonRpcRequest, ValidationUtils} from "ferrum-plumbing";

export class RemoteSignerClient implements Injectable {
    static readonly DUMMY_PRIVATE_KEY = 'DUMMY_PRIVATE_KEY';
    constructor(private api: JsonRpcClient) {}

    /**
     * Remotely signs a transaction.
     * @param network The network
     * @param address This is the signer address, not the private key
     * @param data Data to sign as Hex
     * @param forceLow Force low
     */
    async sign(network: string, address: string, data: string, forceLow: boolean): Promise<EcSignature> {
        ValidationUtils.isTrue(!!network,
            '"network" must be provided');
        ValidationUtils.isTrue(!!address,
            '"address" must be provided');
        const res = await this.api.call({
            command: 'sign',
            params: [network, address, data, forceLow],
        } as JsonRpcRequest);
        return res.data as EcSignature;
    }

    __name__(): string { return 'RemoteSignerClient'; }
}