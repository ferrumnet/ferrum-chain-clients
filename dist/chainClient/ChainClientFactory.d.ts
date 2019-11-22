import { Injectable, Network } from 'ferrum-plumbing';
import { ChainClient, MultiChainConfig } from "./types";
import { BinanceGasPriceProvider, EthereumGasPriceProvider, GasPriceProvider } from './GasPriceProvider';
import { CreateNewAddressFactory } from './CreateNewAddress';
import { RemoteSignerClient } from "./remote/RemoteSignerClient";
export declare class ChainClientFactory implements Injectable {
    private localConfig;
    private binanceGasProvider;
    private ethGasProvider;
    private newAddressFactory;
    private remoteSigner?;
    private readonly networkStage;
    constructor(localConfig: MultiChainConfig, binanceGasProvider: BinanceGasPriceProvider, ethGasProvider: EthereumGasPriceProvider, newAddressFactory: CreateNewAddressFactory, remoteSigner?: RemoteSignerClient | undefined);
    private bnbClient;
    private ethClient;
    private wrap;
    forNetwork(network: Network): ChainClient;
    newAddress(network: Network): import("./CreateNewAddress").CreateNewAddress;
    gasPriceProvider(network: Network): GasPriceProvider;
    __name__(): string;
}
//# sourceMappingURL=ChainClientFactory.d.ts.map