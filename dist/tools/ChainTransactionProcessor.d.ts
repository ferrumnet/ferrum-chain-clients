import { HexString, Injectable, Network } from 'ferrum-plumbing';
import { ChainClientFactory } from '../chainClient/ChainClientFactory';
import { SimpleTransferTransaction } from '../chainClient/types';
export declare class ChainTransactionProcessor implements Injectable {
    private clientFactory;
    constructor(clientFactory: ChainClientFactory);
    checkAccountRemainingFundsForFee(network: Network, address: string, targetCurrency: string, requiredFee: string): Promise<string>;
    calculateTokenTransferFee(network: Network, targetCurrnecy: string): Promise<string>;
    sendFeeForFutureTokenTransfer(network: Network, feeProviderSk: HexString, addressToBeFunded: string, targetCurrency: string, shouldWait: boolean, feeAmount: string): Promise<SimpleTransferTransaction | string | undefined>;
    transferToken(network: Network, fromSk: HexString, fromAddress: string, toAddress: string, currency: string, amount: string, requiredFee: string, shouldWait: boolean): Promise<SimpleTransferTransaction | string>;
    /**
     * TODO: Update to use signer instead of directly using sk
     * Submits a tx and transfer required fees if necessary. Returns all the created transactions.
     * @param fromSk
     */
    sendTokenUsingSk(network: Network, feeProviderSk: HexString, fromSk: HexString, fromAddress: string, toAddress: string, currency: string, amount: string): Promise<(string | SimpleTransferTransaction)[]>;
    __name__(): string;
}
//# sourceMappingURL=ChainTransactionProcessor.d.ts.map