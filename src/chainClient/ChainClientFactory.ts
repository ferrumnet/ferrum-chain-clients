import {Injectable, LocalCache, Network, LoggerFactory} from 'ferrum-plumbing';
import {EthereumClient} from "./EthereumClient";
import {ChainClient, MultiChainConfig, NetworkStage, ChainHistoryClient} from "./types";
import {BinanceChainClient} from './BinanceChainClient';
import {BinanceGasPriceProvider, BscGasPriceProvider, EthereumGasPriceProvider, GasPriceProvider} from './GasPriceProvider';
import {CreateNewAddressFactory} from './CreateNewAddress';
import {RemoteSignerClient} from "./remote/RemoteSignerClient";
import {RemoteClientWrapper} from "./remote/RemoteClientWrapper";
import {FullEthereumClient} from "./ethereum/FullEthereumClient";
import {BitcoinClient} from "./bitcoin/BitcoinClient";
import {BitcoinAddress} from "./bitcoin/BitcoinAddress";
import { EtherScanHistoryClient } from './ethereum/EtherScanHistoryClient';

export class ChainClientFactory implements Injectable {
    private readonly cache: LocalCache;
    constructor(private localConfig: MultiChainConfig,
                private binanceGasProvider: BinanceGasPriceProvider,
                private ethGasProvider: EthereumGasPriceProvider,
                private bscGasProvider: BscGasPriceProvider,
                private newAddressFactory: CreateNewAddressFactory,
                private loggerFactory: LoggerFactory,
                private remoteSigner?: RemoteSignerClient,
                cache?: LocalCache,
                ) {
        this.cache = cache || new LocalCache();
    }

    private bnbClient: BinanceChainClient | undefined;
    private bnbClientTestnet: BinanceChainClient | undefined;
    private ethClient: EthereumClient | undefined;
    private rinkebyClient: EthereumClient | undefined;
    private bscClient: EthereumClient | undefined;
    private bscTestnetClient: EthereumClient | undefined;
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
                    this.ethClient = new FullEthereumClient(network, this.localConfig, this.ethGasProvider, this.loggerFactory);
                }
                return this.wrap(this.ethClient, 'ETHEREUM');
            case 'RINKEBY':
                if (!this.rinkebyClient) {
                    this.rinkebyClient = new FullEthereumClient(network, this.localConfig, this.bscGasProvider, this.loggerFactory);
                }
                return this.wrap(this.rinkebyClient, 'RINKEBY');
            case 'BSC':
                if (!this.bscClient) {
                    this.bscClient = new FullEthereumClient(network, this.localConfig, this.ethGasProvider, this.loggerFactory);
                }
                return this.wrap(this.bscClient, 'RINKEBY');
            case 'BSC_TESTNET':
                if (!this.bscTestnetClient) {
                    this.bscTestnetClient = new FullEthereumClient(network, this.localConfig, this.ethGasProvider, this.loggerFactory);
                }
                return this.wrap(this.bscTestnetClient, 'RINKEBY');
            case 'RINKEBY':
                if (!this.rinkebyClient) {
                    this.rinkebyClient = new FullEthereumClient(network, this.localConfig, this.ethGasProvider, this.loggerFactory);
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
            case 'BSC':
                return this.bscGasProvider!;
            case 'BSC_TESTNET':
                return this.bscGasProvider!;
            case 'BITCOIN':
                return this.bitcoinClient!;
            case 'BITCOIN_TESTNET':
                return this.bitcoinTestnetClient!;
            default:
                throw new Error('ChainClientFactory: Unsupported network: ' + network);
        }
    }

    historyClient(network: Network): ChainHistoryClient {
        switch(network) {
            case 'ETHEREUM':
                return new EtherScanHistoryClient(this.localConfig.etherscanApiKey,
                    'ETHEREUM', this.loggerFactory);
            case 'RINKEBY':
                return new EtherScanHistoryClient(this.localConfig.etherscanApiKey,
                    'RINKEBY', this.loggerFactory);
            case 'BSC':
                return new EtherScanHistoryClient(this.localConfig.bscscanApiKey!,
                    'BSC', this.loggerFactory);
            case 'BSC_TESTNET':
                return new EtherScanHistoryClient(this.localConfig.bscscanApiKey!,
                    'BSC_TESTNET', this.loggerFactory);
            case 'BITCOIN':
            case 'BITCOIN_TESTNET':
                 if (!this.bitcoinClient) {
                     this.bitcoinClient = new BitcoinClient('prod',
                       this.cache, new BitcoinAddress('prod'));
                 }
                 return this.bitcoinClient!;
            default:
                throw new Error('ChainClientFactory.historyClient: Unsupported network: ' + network);
        }
    }

    __name__(): string { return 'ChainClientFactory'; }
}
