/// <reference types="node" />
import { ChainClient, MultiChainConfig, NetworkStage, SimpleTransferTransaction } from './types';
export declare class BinanceChainClient implements ChainClient {
    private networkStage;
    private url;
    private txWaitTimeout;
    constructor(networkStage: NetworkStage, config: MultiChainConfig);
    feeCurrency(): string;
    getBalance(address: string, currency: string): Promise<number>;
    getTransactionById(tid: string): Promise<SimpleTransferTransaction | undefined>;
    processPaymentFromPrivateKey(sk: Buffer, targetAddress: string, currency: string, amount: number): Promise<string>;
    getRecentTransactionsByAddress(address: string): Promise<SimpleTransferTransaction[] | undefined>;
    private api;
    private getSequence;
    waitForTransaction(transactionId: string): Promise<SimpleTransferTransaction | undefined>;
}
//# sourceMappingURL=BinanceChainClient.d.ts.map