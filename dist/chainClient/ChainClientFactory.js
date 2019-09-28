"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EthereumClient_1 = require("./EthereumClient");
const BinanceChainClient_1 = require("./BinanceChainClient");
class ChainClientFactory {
    constructor(localConfig, binanceGasProvider, ethGasProvider, newAddressFactory) {
        this.localConfig = localConfig;
        this.binanceGasProvider = binanceGasProvider;
        this.ethGasProvider = ethGasProvider;
        this.newAddressFactory = newAddressFactory;
        this.networkStage = this.localConfig.networkStage;
    }
    forNetwork(network) {
        switch (network) {
            case 'BINANCE':
                return new BinanceChainClient_1.BinanceChainClient(this.networkStage, this.localConfig);
            case 'ETHEREUM':
                return new EthereumClient_1.EthereumClient(this.networkStage, this.localConfig, this.ethGasProvider);
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