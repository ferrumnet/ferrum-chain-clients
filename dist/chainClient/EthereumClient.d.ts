import Web3 from 'web3';
import { BlockData, ChainClient, EcSignature, MultiChainConfig, NetworkStage, SignableTransaction, SimpleTransferTransaction } from "./types";
import { HexString } from 'ferrum-plumbing';
import { GasPriceProvider } from './GasPriceProvider';
export declare class EthereumClient implements ChainClient {
    private networkStage;
    private gasService;
    private readonly provider;
    private readonly contractAddresses;
    private readonly decimals;
    private readonly requiredConfirmations;
    private readonly txWaitTimeout;
    constructor(networkStage: NetworkStage, config: MultiChainConfig, gasService: GasPriceProvider);
    feeCurrency(): string;
    findContractInfo(contractAddress: string): {
        name: string;
        address: any;
        decimal: any;
    };
    getBlockByNumber(number: number): Promise<BlockData>;
    getBlockNumber(): Promise<number>;
    getTransactionById(tid: string): Promise<SimpleTransferTransaction | undefined>;
    processPaymentFromPrivateKey(skHex: HexString, targetAddress: string, currency: string, amount: number): Promise<string>;
    processPaymentFromPrivateKeyWithGas(skHex: string, targetAddress: string, currency: string, amount: number, gasOverride: number): Promise<string>;
    private createSendTransaction;
    signTransaction(skHex: HexString, transaction: SignableTransaction): Promise<SignableTransaction>;
    decodeSignature(sig: EcSignature): any;
    sign(skHex: HexString, data: HexString): Promise<EcSignature>;
    private createSendEth;
    broadcastTransaction<T>(transaction: SignableTransaction): Promise<HexString>;
    createPaymentTransaction<Tx>(fromAddress: string, targetAddress: string, currency: any, amount: number, gasOverride?: number): Promise<SignableTransaction>;
    /**
     * Note: This only returns incoming transactions to the given address and only works for ERC20 transactions
     */
    getRecentTransactionsByAddress(address: string): Promise<SimpleTransferTransaction[]>;
    getBalance(address: string, currency: string): Promise<number>;
    getBalanceForContract(web3: Web3, address: string, contractAddress: string, decimals: number): Promise<number>;
    waitForTransaction(transactionId: string): Promise<SimpleTransferTransaction | undefined>;
    web3(): Web3;
    private getChainId;
    private getChainOptions;
    private getTransactionError;
}
//# sourceMappingURL=EthereumClient.d.ts.map