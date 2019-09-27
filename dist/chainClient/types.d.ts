import { Network } from 'ferrum-plumbing';
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
export interface SimpleTransferTransaction {
    network: Network;
    fee: number;
    feeCurrency: string;
    from: {
        address: string;
        currency: string;
        amount: number;
    };
    to: {
        address: string;
        currency: string;
        amount: number;
    };
    confirmed: boolean;
    failed: boolean;
    confirmationTime: number;
    id: string;
}
export declare type NetworkStage = 'test' | 'prod';
export interface MultiChainConfig {
    web3Provider: string;
    contractAddresses: {
        [k: string]: string;
    };
    contractDecimals: {
        [k: string]: number;
    };
    binanceChainUrl: string;
    networkStage: NetworkStage;
    requiredEthConfirmations?: number;
    pendingTransactionShowTimeout?: number;
}
export declare const NetworkNativeCurrencies: {
    'ETHEREUM': string;
    'BINANCE': string;
};
export interface ChainClient {
    getTransactionById(tid: string): Promise<SimpleTransferTransaction | undefined>;
    processPaymentFromPrivateKey(sk: ArrayBuffer, targetAddress: string, expectedCurrencyElement: any, amount: number): Promise<string>;
    getRecentTransactionsByAddress(address: string): Promise<SimpleTransferTransaction[] | undefined>;
    getBalance(address: string, currency: string): Promise<number>;
    waitForTransaction(tid: string): Promise<SimpleTransferTransaction | undefined>;
    feeCurrency(): string;
}
export {};
//# sourceMappingURL=types.d.ts.map