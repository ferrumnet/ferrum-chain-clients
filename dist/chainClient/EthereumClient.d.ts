import Web3 from 'web3';
import { BlockData, ChainClient, EcSignature, GasParameters, MultiChainConfig, NetworkStage, SignableTransaction, SimpleTransferTransaction } from "./types";
import { HexString } from 'ferrum-plumbing';
import { GasPriceProvider } from './GasPriceProvider';
export declare abstract class EthereumClient implements ChainClient {
    private networkStage;
    private gasService;
    private readonly provider;
    private readonly requiredConfirmations;
    private readonly txWaitTimeout;
    protected constructor(networkStage: NetworkStage, config: MultiChainConfig, gasService: GasPriceProvider);
    protected network(): "ETHEREUM" | "RINKEBY";
    feeCurrency(): string;
    feeDecimals(): number;
    getBlockByNumber(number: number): Promise<BlockData>;
    getBlockNumber(): Promise<number>;
    private lastBlockNumber;
    private lastBlockRead;
    getCachedCurrentBlock(): Promise<number>;
    getTransactionById(tid: string): Promise<SimpleTransferTransaction | undefined>;
    processPaymentFromPrivateKey(skHex: HexString, targetAddress: string, currency: string, amount: string): Promise<string>;
    processPaymentFromPrivateKeyWithGas(skHex: string, targetAddress: string, currency: string, amount: string, gasOverride: string | GasParameters): Promise<string>;
    private static getGasLimit;
    private getGas;
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
    getBalance(address: string, currency: string): Promise<string>;
    getBalanceForContract(web3: Web3, address: string, contractAddress: string, decimals: number): Promise<string>;
    waitForTransaction(transactionId: string): Promise<SimpleTransferTransaction | undefined>;
    web3(): Web3;
    private getChainId;
    private getChainOptions;
    private static getTransactionError;
    private createErc20SendTransaction;
    private processErc20Transaction;
    private currencyForErc20;
    protected abstract getTokenDecimals(tok: string): Promise<number>;
}
//# sourceMappingURL=EthereumClient.d.ts.map