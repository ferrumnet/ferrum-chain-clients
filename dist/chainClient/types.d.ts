import { HexString, Network } from 'ferrum-plumbing';
interface IDecodedLogEvent {
    name: string;
    type: string;
    value: string;
}
export interface IDecodedLog {
    name: string;
    events: IDecodedLogEvent[];
    address: string;
}
export interface SimpleTransferTransactionItem {
    address: string;
    currency: string;
    amount: string;
    decimals?: number;
    symbol?: string;
}
export interface SimpleTransferTransaction {
    network: Network;
    fee: string;
    feeCurrency: string;
    feeDecimals?: number;
    fromItems: SimpleTransferTransactionItem[];
    toItems: SimpleTransferTransactionItem[];
    confirmed: boolean;
    failed: boolean;
    confirmationTime: number;
    creationTime: number;
    id: string;
    memo?: string;
    reason?: string;
    singleItem: boolean;
}
/**
 * The transaction structure as understood by the kudi / unifyre server
 */
export interface ServerTransactionItem {
    address: string;
    addressType: string;
    amount: string;
    currency: string;
    fakeAddress: boolean;
    itemType?: string;
}
export interface ServerTransaction {
    transactionType: string;
    items: ServerTransactionItem[];
    id: string;
    network: string;
    transactionId: string;
    creationTime: number;
    receiveTime: number;
    confirmationTime: number;
    isConfirmed: boolean;
    failed: boolean;
    transactionData: string;
    notes: string;
    version: number;
    externalFee: string;
    fee: string;
    feeCurrency: string;
}
export interface BlockData {
    hash: string;
    number: number;
    timestamp: number;
    transactionIds: string[];
    transactions?: SimpleTransferTransaction[];
}
export declare type NetworkStage = 'test' | 'prod';
export interface MultiChainConfig {
    web3Provider: string;
    web3ProviderRinkeby: string;
    web3ProviderBsc?: string;
    web3ProviderBscTestnet?: string;
    web3ProviderPolygon?: string;
    web3ProviderMumbaiTestnet?: string;
    etherscanApiKey: string;
    bscscanApiKey?: string;
    polygonscanApiKey?: string;
    binanceChainUrl: string;
    binanceChainTestnetUrl?: string;
    binanceChainSeedNode: string;
    binanceChainTestnetSeedNode?: string;
    requiredEthConfirmations?: number;
    pendingTransactionShowTimeout?: number;
    ethereumTps?: number;
}
export declare const NetworkNativeCurrencies: {
    'ETHEREUM': string;
    'RINKEBY': string;
    'BSC': string;
    'BSC_TESTNET': string;
    'POLYGON': string;
    'MUMBAI_TESTNET': string;
    'BINANCE': string;
    'BINANCE_TESTNET': string;
};
export interface EcSignature {
    r: HexString;
    s: HexString;
    v: number;
    publicKeyHex?: HexString;
}
/**
 * Represents a signable or signed transaction. If signed, signatureHex will have a value, otherwise signableHex will
 * have value.
 */
export interface SignableTransaction {
    transaction: any;
    serializedTransaction: HexString;
    signableHex?: HexString;
    signature?: EcSignature | EcSignature[];
    publicKeyHex?: HexString;
}
export interface GasParameters {
    gasLimit: string;
    gasPrice: string;
}
export interface ContractCallRequest {
    from: string;
    contract: string;
    amount: string;
    data: string;
    gas: GasParameters;
    nonce?: number;
}
export interface ChainTransactionSigner {
    sign(skHexOrAddress: HexString, data: HexString, forceLow: boolean): Promise<EcSignature>;
}
export interface ChainHistoryClient {
    providesHistory(): Boolean;
    getNonBlockTransactions(fromBlock: number, toBlock: number, filter: any): Promise<SimpleTransferTransaction[]>;
    getTransactionsForAddress(address: string, fromBlock: number, toBlock: number, filter: any): Promise<SimpleTransferTransaction[]>;
}
export interface ChainClient extends ChainTransactionSigner {
    getTransactionById(tid: string, includePending?: boolean): Promise<SimpleTransferTransaction | undefined>;
    processPaymentFromPrivateKey(skHex: HexString, targetAddress: string, expectedCurrencyElement: any, amount: string): Promise<string>;
    processPaymentFromPrivateKeyWithGas(skHex: HexString, targetAddress: string, currency: any, amount: string, gasOverride: string | GasParameters): Promise<string>;
    createPaymentTransaction(fromAddress: string, targetAddress: string, currency: any, amount: string, gasOverride?: string | GasParameters, memo?: string, nonce?: number): Promise<SignableTransaction>;
    createSendData(calls: ContractCallRequest[]): Promise<SignableTransaction[]>;
    signTransaction<T>(skHex: HexString, transaction: SignableTransaction): Promise<SignableTransaction>;
    getRecentTransactionsByAddress(address: string, currencies: string[]): Promise<SimpleTransferTransaction[] | undefined>;
    getBalance(address: string, currency: string): Promise<string | undefined>;
    broadcastTransaction<T>(transaction: SignableTransaction): Promise<string>;
    waitForTransaction(tid: string): Promise<SimpleTransferTransaction | undefined>;
    feeCurrency(): string;
    feeDecimals(): number;
    getBlockByNumber(number: number): Promise<BlockData>;
    getBlockNumber(): Promise<number>;
}
export {};
//# sourceMappingURL=types.d.ts.map