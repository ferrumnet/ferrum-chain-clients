"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ferrum_plumbing_1 = require("ferrum-plumbing");
const BinanceChainClient_1 = require("./BinanceChainClient");
const RemoteClientWrapper_1 = require("./remote/RemoteClientWrapper");
const FullEthereumClient_1 = require("./ethereum/FullEthereumClient");
const BitcoinClient_1 = require("./bitcoin/BitcoinClient");
const BitcoinAddress_1 = require("./bitcoin/BitcoinAddress");
class ChainClientFactory {
    constructor(localConfig, binanceGasProvider, ethGasProvider, newAddressFactory, remoteSigner, cache) {
        this.localConfig = localConfig;
        this.binanceGasProvider = binanceGasProvider;
        this.ethGasProvider = ethGasProvider;
        this.newAddressFactory = newAddressFactory;
        this.remoteSigner = remoteSigner;
        this.cache = cache || new ferrum_plumbing_1.LocalCache();
    }
    wrap(client, network) {
        return this.remoteSigner ? new RemoteClientWrapper_1.RemoteClientWrapper(client, this.remoteSigner, network) : client;
    }
    forNetwork(network) {
        switch (network) {
            case 'BINANCE':
                if (!this.bnbClient) {
                    this.bnbClient = new BinanceChainClient_1.BinanceChainClient('prod', this.localConfig);
                }
                return this.wrap(this.bnbClient, 'BINANCE');
            case 'BINANCE_TESTNET':
                if (!this.bnbClientTestnet) {
                    this.bnbClientTestnet = new BinanceChainClient_1.BinanceChainClient('test', this.localConfig);
                }
                return this.wrap(this.bnbClientTestnet, 'BINANCE_TESTNET');
            case 'ETHEREUM':
                if (!this.ethClient) {
                    this.ethClient = new FullEthereumClient_1.FullEthereumClient('prod', this.localConfig, this.ethGasProvider);
                }
                return this.wrap(this.ethClient, 'ETHEREUM');
            case 'RINKEBY':
                if (!this.rinkebyClient) {
                    this.rinkebyClient = new FullEthereumClient_1.FullEthereumClient('test', this.localConfig, this.ethGasProvider);
                }
                return this.wrap(this.rinkebyClient, 'RINKEBY');
            case 'BITCOIN':
                if (!this.bitcoinClient) {
                    this.bitcoinClient = new BitcoinClient_1.BitcoinClient('prod', this.cache, new BitcoinAddress_1.BitcoinAddress('prod'));
                }
                return this.wrap(this.bitcoinClient, 'BITCOIN');
            case 'BITCOIN_TESTNET':
                if (!this.bitcoinTestnetClient) {
                    this.bitcoinTestnetClient = new BitcoinClient_1.BitcoinClient('test', this.cache, new BitcoinAddress_1.BitcoinAddress('test'));
                }
                return this.wrap(this.bitcoinTestnetClient, 'BITCOIN_TESTNET');
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
            case 'BINANCE_TESTNET':
                return this.binanceGasProvider;
            case 'ETHEREUM':
                return this.ethGasProvider;
            case 'RINKEBY':
                return this.ethGasProvider;
            default:
                throw new Error('ChainClientFactory: Unsupported network: ' + network);
        }
    }
    __name__() { return 'ChainClientFactory'; }
}
exports.ChainClientFactory = ChainClientFactory;
//# sourceMappingURL=ChainClientFactory.js.map