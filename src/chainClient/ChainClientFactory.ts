import {Injectable, Network} from 'ferrum-plumbing';
import {EthereumClient} from "./EthereumClient";
import {ChainClient, MultiChainConfig, NetworkStage} from "./types";
import {BinanceChainClient} from './BinanceChainClient';

export class ChainClientFactory implements Injectable {
    private readonly networkStage: NetworkStage;
    constructor(private localConfig: MultiChainConfig) {
        this.networkStage = this.localConfig.networkStage as NetworkStage;
    }

    forNetwork(network: Network): ChainClient {
        switch (network) {
            case 'BINANCE':
                return new BinanceChainClient(this.networkStage, this.localConfig);
            case 'ETHEREUM':
                return new EthereumClient(this.networkStage, this.localConfig);
            default:
                throw new Error('ChainClientFactory: Unsupported network: ' + network)
        }
    }

    __name__(): string {
        return 'ChainClientFactory';
    }
}

