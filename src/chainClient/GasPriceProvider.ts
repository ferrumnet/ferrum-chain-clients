import fetch from "cross-fetch";
import {Injectable} from 'ferrum-plumbing';
import Web3 from 'web3';
import BN from 'bn.js';

export interface EthGasPrice {
    low: number;
    medium: number;
    high: number;
}

export interface GasPriceProvider {
    getGasPrice(): Promise<EthGasPrice>;
    getTransactionGas(currency: string, gasPrice: number, currentTargetBalance?: number): number;
}

function gweiToEth(gweiNum: number) {
    return Number(Web3.utils.fromWei(Web3.utils.toWei(new BN(gweiNum), 'gwei'), 'ether'));
}

export const BINANCE_FEE = 0.000375;

export class BinanceGasPriceProvider implements GasPriceProvider, Injectable {
    async getGasPrice(): Promise<EthGasPrice> {
        return {
            low: BINANCE_FEE,
            medium: BINANCE_FEE,
            high: BINANCE_FEE,
        };
    }

    getTransactionGas(currency: string, _: number, __?: number) {
        return BINANCE_FEE;
    }

    __name__(): string {
        return 'BinanceGasPriceProvider';
    }
}

export class EthereumGasPriceProvider implements GasPriceProvider, Injectable {
    private static GasStationUrl = 'https://ethgasstation.info/json/ethgasAPI.json';
    private static GasTimeout = 30000;
    private lastUpdate = 0;
    private lastPrice: EthGasPrice|undefined;
    constructor() {}

    public static ERC_20_GAS_ZERO_ACCOUNT = 52595;
    public static ERC_20_GAS_NON_ZERO_ACCOUNT = 36693;
    public static ETH_TX_GAS = 21000;

    async getGasPrice(): Promise<EthGasPrice> {
        if (this.lastUpdate > (Date.now() - EthereumGasPriceProvider.GasTimeout)) {
            return this.lastPrice!;
        }
        const res = await fetch(EthereumGasPriceProvider.GasStationUrl, {});
        if (res.status >= 400) {
            const txt = await res.text();
            throw new Error('Error getting gas price: ' + txt);
        }
        const prices = await res.json();
        this.lastPrice = {
            low: gweiToEth(prices['safeLow'] / 10),
            medium: gweiToEth(prices['average'] / 10),
            high: gweiToEth(prices['fast'] / 10),
        };
        return this.lastPrice;
    }

    getTransactionGas(currency: string, gasPrice: number, currentTargetBalance?: number) {
        const gasAmount = currency === 'ETH' ? EthereumGasPriceProvider.ETH_TX_GAS :
                currentTargetBalance && currentTargetBalance > 0 ?
                    EthereumGasPriceProvider.ERC_20_GAS_NON_ZERO_ACCOUNT :
                        EthereumGasPriceProvider.ERC_20_GAS_ZERO_ACCOUNT;
        return gasAmount * gasPrice;
    }

    __name__(): string {
        return 'GasPriceProvider';
    }
}
