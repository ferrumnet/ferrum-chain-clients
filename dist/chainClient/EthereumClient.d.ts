import Web3 from 'web3';
import { BlockData, ChainClient, EcSignature, GasParameters, MultiChainConfig, SignableTransaction, SimpleTransferTransaction, ContractCallRequest } from "./types";
import { HexString, ServiceMultiplexer, Throttler, LoggerFactory, LocalCache, UsesServiceMultiplexer, Network } from 'ferrum-plumbing';
import { GasPriceProvider } from './GasPriceProvider';
export declare const ETHEREUM_CHAIN_ID_FOR_NETWORK: any;
export declare abstract class EthereumClient implements ChainClient, UsesServiceMultiplexer {
    private gasService;
    private readonly requiredConfirmations;
    private readonly txWaitTimeout;
    providerMux: ServiceMultiplexer<Web3>;
    throttler: Throttler;
    private web3Instances;
    private _network;
    protected constructor(net: Network, config: MultiChainConfig, gasService: GasPriceProvider, logFac: LoggerFactory);
    setMode(mode: 'load-balance' | 'one-hot'): void;
    protected network(): Network;
    feeCurrency(): string;
    feeDecimals(): number;
    getBlockByNumber(number: number): Promise<BlockData>;
    getBlockNumber(): Promise<number>;
    localCache: LocalCache;
    getCachedCurrentBlock(): Promise<number>;
    getTransactionById(tid: string, includePending?: boolean): Promise<SimpleTransferTransaction | undefined>;
    private getTransactionByIdWithBlock;
    processPaymentFromPrivateKey(skHex: HexString, targetAddress: string, currency: string, amount: string): Promise<string>;
    processPaymentFromPrivateKeyWithGas(skHex: string, targetAddress: string, currency: string, amount: string, gasOverride: string | GasParameters): Promise<string>;
    private getGasLimit;
    protected erc20GasLimit(currency: string, from: string, to: string, amountInt: string): Promise<number>;
    private getGas;
    createSendData(calls: ContractCallRequest[]): Promise<SignableTransaction[]>;
    private createSendEth;
    signTransaction(skHex: HexString, transaction: SignableTransaction): Promise<SignableTransaction>;
    decodeSignature(sig: EcSignature): any;
    sign(skHex: HexString, data: HexString): Promise<EcSignature>;
    broadcastTransaction<T>(transaction: SignableTransaction): Promise<HexString>;
    createPaymentTransaction<Tx>(fromAddress: string, targetAddress: string, currency: string, amount: string, gasOverride?: string | GasParameters, memo?: string, nonce?: number): Promise<SignableTransaction>;
    /**
     * Note: This only returns incoming transactions to the given address and only works for ERC20 transactions
     */
    getRecentTransactionsByAddress(address: string, currencies: string[]): Promise<SimpleTransferTransaction[]>;
    getBalance(address: string, currency: string): Promise<string | undefined>;
    getBalanceForContract(web3: Web3, address: string, contractAddress: string, decimals: number): Promise<string>;
    waitForTransaction(transactionId: string): Promise<SimpleTransferTransaction | undefined>;
    web3(): Web3;
    private web3Instance;
    private getChainId;
    private getChainOptions;
    private static getTransactionError;
    private createErc20SendTransaction;
    private processErc20Transaction;
    private currencyForErc20;
    protected abstract getTokenDecimals(tok: string): Promise<number>;
}
//# sourceMappingURL=EthereumClient.d.ts.map