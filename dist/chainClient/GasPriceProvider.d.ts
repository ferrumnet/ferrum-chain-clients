import { Injectable } from 'ferrum-plumbing';
export declare const FRM = "0xe5caef4af8780e59df925470b050fb23c43ca68c";
export interface EthGasPrice {
    low: string;
    medium: string;
    high: string;
}
export interface GasPriceProvider {
    getGasPrice(): Promise<EthGasPrice>;
    getTransactionGas(currency: string, gasPrice: string, currentTargetBalance?: string): string;
}
export declare const BINANCE_FEE = "0.000375";
export declare class BinanceGasPriceProvider implements GasPriceProvider, Injectable {
    getGasPrice(): Promise<EthGasPrice>;
    getTransactionGas(currency: string, _: string, __?: string): string;
    __name__(): string;
}
export declare class EthereumGasPriceProvider implements GasPriceProvider, Injectable {
    private static GasStationUrl;
    private static GasTimeout;
    private lastUpdate;
    private lastPrice;
    constructor();
    static ETH_TX_GAS: number;
    private static ERC_20_GAS_ZERO_ACCOUNT;
    private static ERC_20_GAS_NON_ZERO_ACCOUNT;
    private static ERC_20_GAS_ZERO_ACCOUNT_FOR_CUR;
    private static ERC_20_GAS_NON_ZERO_ACCOUNT_FOR_CUR;
    static gasLimiForErc20(currency: string, balance: string): number;
    getGasPrice(): Promise<EthGasPrice>;
    getTransactionGas(currency: string, gasPrice: string, currentTargetBalance?: string): string;
    __name__(): string;
}
//# sourceMappingURL=GasPriceProvider.d.ts.map