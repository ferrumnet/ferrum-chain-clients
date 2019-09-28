import { Injectable, Network } from 'ferrum-plumbing';
import { ChainClient, MultiChainConfig } from "./types";
import { BinanceGasPriceProvider, EthereumGasPriceProvider, GasPriceProvider } from './GasPriceProvider';
import { CreateNewAddressFactory } from './CreateNewAddress';
export declare class ChainClientFactory implements Injectable {
    private localConfig;
    private binanceGasProvider;
    private ethGasProvider;
    private newAddressFactory;
    private readonly networkStage;
    constructor(localConfig: MultiChainConfig, binanceGasProvider: BinanceGasPriceProvider, ethGasProvider: EthereumGasPriceProvider, newAddressFactory: CreateNewAddressFactory);
    forNetwork(network: Network): ChainClient;
    newAddress(network: Network): import("./CreateNewAddress").CreateNewAddress;
    gasPriceProvider(network: Network): GasPriceProvider;
    __name__(): string;
}
//# sourceMappingURL=ChainClientFactory.d.ts.map