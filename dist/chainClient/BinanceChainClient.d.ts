import { BlockData, ChainClient, EcSignature, MultiChainConfig, NetworkStage, SignableTransaction, SimpleTransferTransaction } from './types';
import { HexString } from 'ferrum-plumbing';
export declare class BinanceChainClient implements ChainClient {
    private networkStage;
    private readonly url;
    private readonly txWaitTimeout;
    private seedNodeUrl;
    bnbClient: any;
    constructor(networkStage: NetworkStage, config: MultiChainConfig);
    feeCurrency(): string;
    getBalance(address: string, currency: string): Promise<number | undefined>;
    getTransactionById(tid: string): Promise<SimpleTransferTransaction | undefined>;
    processPaymentFromPrivateKeyWithGas(skHex: string, targetAddress: string, currency: any, amount: number, gasOverride: number): Promise<string>;
    createPaymentTransaction(fromAddress: string, targetAddress: string, asset: any, payAmount: number, gasOverride?: number, memo?: string): Promise<SignableTransaction>;
    signTransaction<T>(skHex: HexString, transaction: SignableTransaction): Promise<SignableTransaction>;
    broadcastTransaction<T>(transaction: SignableTransaction): Promise<string>;
    sign(skHex: HexString, data: HexString, forceLow?: boolean): Promise<EcSignature>;
    processPaymentFromPrivateKey(sk: HexString, targetAddress: string, currency: string, amount: number): Promise<string>;
    _processPaymentFromPrivateKey(sk: HexString, targetAddress: string, currency: string, amount: number): Promise<string>;
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
    private getBnbClient;
    private serializeTx;
    private deserializeTx;
    private getMsgFromSignMsg;
}
//# sourceMappingURL=BinanceChainClient.d.ts.map