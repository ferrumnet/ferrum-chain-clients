"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EthereumClient_1 = require("./EthereumClient");
const BinanceChainClient_1 = require("./BinanceChainClient");
const RemoteClientWrapper_1 = require("./remote/RemoteClientWrapper");
class ChainClientFactory {
    constructor(localConfig, binanceGasProvider, ethGasProvider, newAddressFactory, remoteSigner) {
        this.localConfig = localConfig;
        this.binanceGasProvider = binanceGasProvider;
        this.ethGasProvider = ethGasProvider;
        this.newAddressFactory = newAddressFactory;
        this.remoteSigner = remoteSigner;
        this.networkStage = this.localConfig.networkStage;
    }
    wrap(client, network) {
        return this.remoteSigner ? new RemoteClientWrapper_1.RemoteClientWrapper(client, this.remoteSigner, network) : client;
    }
    forNetwork(network) {
        switch (network) {
            case 'BINANCE':
                if (!this.bnbClient) {
                    this.bnbClient = new BinanceChainClient_1.BinanceChainClient(this.networkStage, this.localConfig);
                }
                return this.wrap(this.bnbClient, 'BINANCE');
            case 'ETHEREUM':
                if (!this.ethClient) {
                    this.ethClient = new EthereumClient_1.EthereumClient(this.networkStage, this.localConfig, this.ethGasProvider);
                }
                return this.wrap(this.ethClient, 'ETHEREUM');
            default:
                throw new Error('ChainClientFactory: Unsupported network: ' + network);
        }
    }
    newAddress(network) {
        return this.newAddressFactory.create(network);
    }
    gasPriceProvider(network) {
        switch (network) {
            case 'BINANCE':
                return this.binanceGasProvider;
            case 'ETHEREUM':
                return this.ethGasProvider;
            default:
                throw new Error('ChainClientFactory: Unsupported network: ' + network);
        }
    }
    __name__() {
        return 'ChainClientFactory';
    }
}
exports.ChainClientFactory = ChainClientFactory;
//# sourceMappingURL=ChainClientFactory.js.map