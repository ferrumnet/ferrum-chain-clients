import {Injectable, LocalCache, Network, LoggerFactory, NetworkedConfig} from 'ferrum-plumbing';
import {EthereumClient} from "./EthereumClient";
import {ChainClient, MultiChainConfig, ChainHistoryClient} from "./types";
import {BinanceGasPriceProvider, BscGasPriceProvider, EthereumGasPriceProvider, GasPriceProvider, PolygonGasPriceProvider} from './GasPriceProvider';
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
                private polygonGasProvider: PolygonGasPriceProvider,
                private newAddressFactory: CreateNewAddressFactory,
                private loggerFactory: LoggerFactory,
                private remoteSigner?: RemoteSignerClient,
                cache?: LocalCache,
                ) {
        this.cache = cache || new LocalCache();
    }

    private ethClient: EthereumClient | undefined;
    private rinkebyClient: EthereumClient | undefined;
    private bscClient: EthereumClient | undefined;
    private bscTestnetClient: EthereumClient | undefined;
    private polygonClient: EthereumClient | undefined;
    private mumbaiTestnetClient: EthereumClient | undefined;
    private bitcoinClient: BitcoinClient | undefined;
    private bitcoinTestnetClient: BitcoinClient | undefined;
    private evmClients: NetworkedConfig<EthereumClient> = {};

    private wrap(client: ChainClient, network: Network) {
        return this.remoteSigner ? new RemoteClientWrapper(client, this.remoteSigner, network) : client;
    }

    forNetwork(network: Network): ChainClient {
        switch (network) {
            case 'BINANCE':
                throw new Error('Support removed');
            case 'BINANCE_TESTNET':
                throw new Error('Support removed');
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
            case 'POLYGON':
                if (!this.polygonClient) {
                    this.polygonClient = new FullEthereumClient(network, this.localConfig, this.ethGasProvider, this.loggerFactory);
                }
                return this.wrap(this.polygonClient, 'POLYGON');
            case 'MUMBAI_TESTNET':
                if (!this.mumbaiTestnetClient) {
                    this.mumbaiTestnetClient = new FullEthereumClient(network, this.localConfig, this.ethGasProvider, this.loggerFactory);
                }
                return this.wrap(this.mumbaiTestnetClient, 'MUMBAI_TESTNET');
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
                if (!this.evmClients[network]) {
                    this.evmClients[network] = new FullEthereumClient(network, this.localConfig, this.ethGasProvider, this.loggerFactory);
                }
                return this.wrap(this.evmClients[network], network);
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
            case 'POLYGON':
                return this.polygonGasProvider!;
            case 'MUMBAI_TESTNET':
                return this.polygonGasProvider!;
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
            case 'POLYGON':
                return new EtherScanHistoryClient(this.localConfig.polygonscanApiKey!,
                    'POLYGON', this.loggerFactory);
            case 'MUMBAI_TESTNET':
                return new EtherScanHistoryClient(this.localConfig.polygonscanApiKey!,
                    'MUMBAI_TESTNET', this.loggerFactory);
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
