import { Injectable } from 'ferrum-plumbing';
export interface EthGasPrice {
    low: number;
    medium: number;
    high: number;
}
export interface GasPriceProvider {
    getGasPrice(): Promise<EthGasPrice>;
    getTransactionGas(currency: string, gasPrice: number, currentTargetBalance?: number): number;
}
export declare const BINANCE_FEE = 0.000375;
export declare class BinanceGasPriceProvider implements GasPriceProvider, Injectable {
    getGasPrice(): Promise<EthGasPrice>;
    getTransactionGas(currency: string, _: number, __?: number): number;
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
    static gasPriceForErc20(currency: string, balance: number): number;
    getGasPrice(): Promise<EthGasPrice>;
    getTransactionGas(currency: string, gasPrice: number, currentTargetBalance?: number): number;
    __name__(): string;
}
//# sourceMappingURL=GasPriceProvider.d.ts.map