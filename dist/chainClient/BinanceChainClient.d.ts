import { ChainClient, MultiChainConfig, NetworkStage, SimpleTransferTransaction } from './types';
import { HexString } from 'ferrum-plumbing';
export declare class BinanceChainClient implements ChainClient {
    private networkStage;
    private readonly url;
    private readonly txWaitTimeout;
    constructor(networkStage: NetworkStage, config: MultiChainConfig);
    feeCurrency(): string;
    getBalance(address: string, currency: string): Promise<number | undefined>;
    getTransactionById(tid: string): Promise<SimpleTransferTransaction | undefined>;
    processPaymentFromPrivateKey(sk: HexString, targetAddress: string, currency: string, amount: number): Promise<string>;
    getRecentTransactionsByAddress(address: string): Promise<SimpleTransferTransaction[] | undefined>;
    private api;
    private getSequence;
    waitForTransaction(transactionId: string): Promise<SimpleTransferTransaction | undefined>;
}
//# sourceMappingURL=BinanceChainClient.d.ts.map