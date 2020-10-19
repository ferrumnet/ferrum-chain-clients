import fetch from "cross-fetch";
import {Injectable} from 'ferrum-plumbing';
import Web3 from 'web3';
import BN from 'bn.js';
import {ChainUtils, ETH_DECIMALS} from "./ChainUtils";

export const FRM = '0xe5caef4af8780e59df925470b050fb23c43ca68c';

export interface EthGasPrice {
    low: string;
    medium: string;
    high: string;
}

export interface GasPriceProvider {
    getGasPrice(): Promise<EthGasPrice>;
    getTransactionGas(currency: string, gasPrice: string, currentTargetBalance?: string): string;
}

function gweiToEth(gweiNum: number) {
    return Web3.utils.fromWei(Web3.utils.toWei(new BN(gweiNum), 'gwei'), 'ether');
}

export const BINANCE_FEE = '0.000375';

export const BITCOIN_FEE = '0.0001';

export class BinanceGasPriceProvider implements GasPriceProvider, Injectable {
    async getGasPrice(): Promise<EthGasPrice> {
        return {
            low: BINANCE_FEE,
            medium: BINANCE_FEE,
            high: BINANCE_FEE,
        };
    }

    getTransactionGas(currency: string, _: string, __?: string) {
        return BINANCE_FEE;
    }

    __name__(): string {
        return 'BinanceGasPriceProvider';
    }
}

export class EthereumGasPriceProvider implements GasPriceProvider, Injectable {
    private static GasStationUrl = 'https://ethgasstation.info/json/ethgasAPI.json';
    static readonly GasTimeout = 30000;
    private lastUpdate = 0;
    private lastPrice: EthGasPrice|undefined;
    constructor() {}

    public static ETH_TX_GAS = 21000;
    private static ERC_20_GAS_ZERO_ACCOUNT = 150000; // TODO: Adjust based on previous transactoins
    private static ERC_20_GAS_NON_ZERO_ACCOUNT = 80000;
    private static ERC_20_GAS_ZERO_ACCOUNT_FOR_CUR: any = {
        FRM: 52595,
    };
    private static ERC_20_GAS_NON_ZERO_ACCOUNT_FOR_CUR: any = {
        FRM: 36693,
    };

    static gasLimiForErc20(currency: string, balance: string): number {
        const tok = ChainUtils.tokenPart(currency);
        if (Number(balance) === 0) {
            return EthereumGasPriceProvider.ERC_20_GAS_ZERO_ACCOUNT_FOR_CUR[tok] || EthereumGasPriceProvider.ERC_20_GAS_ZERO_ACCOUNT;
        }
        return EthereumGasPriceProvider.ERC_20_GAS_NON_ZERO_ACCOUNT_FOR_CUR[tok] || EthereumGasPriceProvider.ERC_20_GAS_NON_ZERO_ACCOUNT;
    }

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

    getTransactionGas(currency: string, gasPrice: string, currentTargetBalance?: string) {
        const tok = ChainUtils.tokenPart(currency);
        const gasAmount = tok === 'ETH' ? EthereumGasPriceProvider.ETH_TX_GAS :
                EthereumGasPriceProvider.gasLimiForErc20(currency, currentTargetBalance || '0');
        return ChainUtils.toDecimalStr(new BN(gasAmount)
            .mul(new BN(ChainUtils.toBigIntStr(gasPrice, ETH_DECIMALS))).toString(), ETH_DECIMALS);
    }

    __name__(): string {
        return 'GasPriceProvider';
    }
}
