import { HexString, Injectable, Network } from 'ferrum-plumbing';
import { ChainClientFactory } from '../chainClient/ChainClientFactory';
import { SimpleTransferTransaction } from '../chainClient/types';
export declare class ChainTransactionProcessor implements Injectable {
    private clientFactory;
    constructor(clientFactory: ChainClientFactory);
    checkAccountRemainingFundsForFee(network: Network, address: string, targetCurrency: string, requiredFee: number): Promise<number>;
    calculateTokenTransferFee(network: Network, targetCurrnecy: string): Promise<number>;
    sendFeeForFutureTokenTransfer(network: Network, feeProviderSk: HexString, addressToBeFunded: string, targetCurrency: string, shouldWait: boolean, feeAmount: number): Promise<SimpleTransferTransaction | string | undefined>;
    transferToken(network: Network, fromSk: HexString, fromAddress: string, toAddress: string, currency: string, amount: number, requiredFee: number, shouldWait: boolean): Promise<SimpleTransferTransaction | string>;
    /**
     * TODO: Update to use signer instead of directly using sk
     * Submits a tx and transfer required fees if necessary. Returns all the created transactions.
     * @param fromSk
     */
    sendTokenUsingSk(network: Network, feeProviderSk: HexString, fromSk: HexString, fromAddress: string, toAddress: string, currency: string, amount: number): Promise<(string | SimpleTransferTransaction)[]>;
    __name__(): string;
}
//# sourceMappingURL=ChainTransactionProcessor.d.ts.map