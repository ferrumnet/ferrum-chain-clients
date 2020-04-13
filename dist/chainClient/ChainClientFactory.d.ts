import { Injectable, LocalCache, Network } from 'ferrum-plumbing';
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
    private readonly cache;
    constructor(localConfig: MultiChainConfig, binanceGasProvider: BinanceGasPriceProvider, ethGasProvider: EthereumGasPriceProvider, newAddressFactory: CreateNewAddressFactory, remoteSigner?: RemoteSignerClient | undefined, cache?: LocalCache);
    private bnbClient;
    private bnbClientTestnet;
    private ethClient;
    private rinkebyClient;
    private bitcoinClient;
    private bitcoinTestnetClient;
    private wrap;
    forNetwork(network: Network): ChainClient;
    newAddress(network: Network): import("./CreateNewAddress").CreateNewAddress;
    gasPriceProvider(network: Network): GasPriceProvider;
    __name__(): string;
}
//# sourceMappingURL=ChainClientFactory.d.ts.map