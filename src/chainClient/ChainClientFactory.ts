import {Injectable, LocalCache, Network} from 'ferrum-plumbing';
import {EthereumClient} from "./EthereumClient";
import {ChainClient, MultiChainConfig, NetworkStage} from "./types";
import {BinanceChainClient} from './BinanceChainClient';
import {BinanceGasPriceProvider, EthereumGasPriceProvider, GasPriceProvider} from './GasPriceProvider';
import {CreateNewAddressFactory} from './CreateNewAddress';
import {RemoteSignerClient} from "./remote/RemoteSignerClient";
import {RemoteClientWrapper} from "./remote/RemoteClientWrapper";
import {FullEthereumClient} from "./ethereum/FullEthereumClient";
import {BitcoinClient} from "./bitcoin/BitcoinClient";
import {BitcoinAddress} from "./bitcoin/BitcoinAddress";

export class ChainClientFactory implements Injectable {
    private readonly cache: LocalCache;
    constructor(private localConfig: MultiChainConfig,
                private binanceGasProvider: BinanceGasPriceProvider,
                private ethGasProvider: EthereumGasPriceProvider,
                private newAddressFactory: CreateNewAddressFactory,
                private remoteSigner?: RemoteSignerClient,
                cache?: LocalCache,
                ) {
        this.cache = cache || new LocalCache();
    }

    private bnbClient: BinanceChainClient | undefined;
    private bnbClientTestnet: BinanceChainClient | undefined;
    private ethClient: EthereumClient | undefined;
    private rinkebyClient: EthereumClient | undefined;
    private bitcoinClient: BitcoinClient | undefined;
    private bitcoinTestnetClient: BitcoinClient | undefined;

    private wrap(client: ChainClient, network: Network) {
        return this.remoteSigner ? new RemoteClientWrapper(client, this.remoteSigner, network) : client;
    }

    forNetwork(network: Network): ChainClient {
        switch (network) {
            case 'BINANCE':
                if (!this.bnbClient) {
                    this.bnbClient = new BinanceChainClient('prod', this.localConfig);
                }
                return this.wrap(this.bnbClient, 'BINANCE');
            case 'BINANCE_TESTNET':
                if (!this.bnbClientTestnet) {
                    this.bnbClientTestnet = new BinanceChainClient('test', this.localConfig);
                }
                return this.wrap(this.bnbClientTestnet, 'BINANCE_TESTNET');
            case 'ETHEREUM':
                if (!this.ethClient) {
                    this.ethClient = new FullEthereumClient('prod' as NetworkStage, this.localConfig, this.ethGasProvider);
                }
                return this.wrap(this.ethClient, 'ETHEREUM');
            case 'RINKEBY':
                if (!this.rinkebyClient) {
                    this.rinkebyClient = new FullEthereumClient('test', this.localConfig, this.ethGasProvider);
                }
                return this.wrap(this.rinkebyClient, 'RINKEBY');
            case 'BITCOIN':
                 if (!this.bitcoinClient) {
                     this.bitcoinClient = new BitcoinClient('prod',
                       this.cache, new BitcoinAddress('prod'));
                 }
                 return this.wrap(this.bitcoinClient, 'BITCOIN');
            case 'BITCOIN_TESTNET':
                if (!this.bitcoinTestnetClient) {
                    this.bitcoinTestnetClient = new BitcoinClient('test',
                      this.cache, new BitcoinAddress('test'));
                }
                return this.wrap(this.bitcoinTestnetClient, 'BITCOIN_TESTNET');
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

    __name__(): string { return 'ChainClientFactory'; }
}
