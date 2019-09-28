import { HexString, Injectable, Network } from 'ferrum-plumbing';
import { ChainClientFactory } from '../chainClient/ChainClientFactory';
export declare class ChainTransactionProcessor implements Injectable {
    private clientFactory;
    constructor(clientFactory: ChainClientFactory);
    /**
     * TODO: Update to use signer instead of directly using sk
     * Submits a tx and transfer required fees if necessary. Returns all the created transactions.
     * @param fromSk
     */
    sendTokenUsingSk(network: Network, feeProviderSk: HexString, fromSk: HexString, fromAddress: string, toAddress: string, currency: string, amount: number): Promise<import("..").SimpleTransferTransaction[]>;
    __name__(): string;
}
//# sourceMappingURL=ChainTransactionProcessor.d.ts.map