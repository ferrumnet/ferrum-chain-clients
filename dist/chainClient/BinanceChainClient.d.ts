import { BlockData, ChainClient, MultiChainConfig, NetworkStage, SimpleTransferTransaction } from './types';
import { HexString } from 'ferrum-plumbing';
export declare class BinanceChainClient implements ChainClient {
    private networkStage;
    private readonly url;
    private readonly txWaitTimeout;
    private seedNodeUrl;
    constructor(networkStage: NetworkStage, config: MultiChainConfig);
    feeCurrency(): string;
    getBalance(address: string, currency: string): Promise<number | undefined>;
    getTransactionById(tid: string): Promise<SimpleTransferTransaction | undefined>;
    processPaymentFromPrivateKeyWithGas(skHex: string, targetAddress: string, currency: any, amount: number, gasOverride: number): Promise<string>;
    processPaymentFromPrivateKey(sk: HexString, targetAddress: string, currency: string, amount: number): Promise<string>;
    getRecentTransactionsByAddress(address: string): Promise<SimpleTransferTransaction[] | undefined>;
    private api;
    private getSequence;
    waitForTransaction(transactionId: string): Promise<SimpleTransferTransaction | undefined>;
    getBlockByNumberFromSeedNode(number: number): Promise<BlockData>;
    getBlockByNumber(number: number): Promise<BlockData>;
    getBlockByNumberFromApi(number: number): Promise<BlockData>;
    getBlockNumber(): Promise<number>;
    private callFullApi;
    private callApi;
    private addFeeToRawParsedTx;
    private parseTx;
}
//# sourceMappingURL=BinanceChainClient.d.ts.map