import {Injectable, Network} from 'ferrum-plumbing';
import {EthereumClient} from "./EthereumClient";
import {ChainClient, MultiChainConfig, NetworkStage} from "./types";
import {BinanceChainClient} from './BinanceChainClient';
import {BinanceGasPriceProvider, EthereumGasPriceProvider, GasPriceProvider} from './GasPriceProvider';
import {CreateNewAddressFactory} from './CreateNewAddress';

export class ChainClientFactory implements Injectable {
    private readonly networkStage: NetworkStage;
    constructor(private localConfig: MultiChainConfig,
                private binanceGasProvider: BinanceGasPriceProvider,
                private ethGasProvider: EthereumGasPriceProvider,
                private newAddressFactory: CreateNewAddressFactory,
                ) {
        this.networkStage = this.localConfig.networkStage as NetworkStage;
    }

    forNetwork(network: Network): ChainClient {
        switch (network) {
            case 'BINANCE':
                return new BinanceChainClient(this.networkStage, this.localConfig);
            case 'ETHEREUM':
                return new EthereumClient(this.networkStage, this.localConfig, this.ethGasProvider);
            default:
                throw new Error('ChainClientFactory: Unsupported network: ' + network)
        }
    }

    newAddress(network: Network) {
        return this.newAddressFactory.create(network);
    }

    gasPriceProvider(network: Network): GasPriceProvider {
        switch (network) {
            case 'BINANCE':
                return this.binanceGasProvider;
            case 'ETHEREUM':
                return this.ethGasProvider;
            default:
                throw new Error('ChainClientFactory: Unsupported network: ' + network);
        }
    }

    __name__(): string {
        return 'ChainClientFactory';
    }
}
