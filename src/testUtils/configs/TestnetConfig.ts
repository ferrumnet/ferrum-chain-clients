import {EthereumClient} from '../../chainClient/EthereumClient';
import {MultiChainConfig} from '../../chainClient/types';
import {
    BinanceGasPriceProvider,
    EthereumGasPriceProvider,
    EthGasPrice,
} from '../../chainClient/GasPriceProvider';
import {ChainClientFactory, BinanceChainClient} from '../..';
import {BinanceChainAddress, CreateNewAddressFactory, EthereumAddress} from '../../chainClient/CreateNewAddress';

export const TEST_ACCOUNTS = {
    mainAccountSk: '3C6681B912ABEA03AB2D625759FE38E9BC7301120C13CFA3A3217112A3F2A919',
    mainAccountAddress: '0x0D959c295E36c140AB766dC12E21eBBB411Bd611',
    mainAccountAddressBnb: 'tbnb1mm8t4rexcz44wrhxv2ac94lpmjdsjx73jkyhzr',
    secondAccountSk: 'ec2a2b02f465f7e77d1b6128c564748eee8bdca22cce008dbce4e6dc1a44d993',
    secondAccountAddress: '0x8017877A1C06efbc7f444AC709119C1e209F26Ee',
};

export const TESTNET_CONFIG = {
    binanceChainUrl: 'https://testnet-dex.binance.org',
    networkStage: 'test',
    contractAddresses: {
        'FRM': '0x93698a057cec27508a9157a946e03e277b46fe56',
    },
    contractDecimals: {
        'FRM': 6,
    },
    web3Provider: 'https://rinkeby.infura.io/v3/d7fb8b4b80a04950aac6d835a3c790aa',
    binanceChainSeedNode: 'https://data-seed-pre-0-s3.binance.org',
    requiredEthConfirmations: 0,
} as MultiChainConfig;

export const GANACHE_CONFIG = {
    ...TESTNET_CONFIG,
    web3Provider: 'http://localhost:7545',
} as MultiChainConfig;


const TEST_PROD_CONFIG = {
    web3Provider: 'https://mainnet.infura.io/v3/2b1dbb61817f4ae6ac90d9b41662993b',
    contractAddresses: {
        FRM: '0xe5caef4af8780e59df925470b050fb23c43ca68c',
    },
    contractDecimals: {
        FRM: 6,
    },
    binanceChainUrl: 'https://dex.binance.org',
    binanceChainSeedNode: '',
    networkStage: 'test',
} as MultiChainConfig;

export function ethereumClientForProd() {
    return new EthereumClient('prod', TEST_PROD_CONFIG, new EthereumGasPriceProvider());
}

export function binanceClientForProd() {
    return new BinanceChainClient('prod', TEST_PROD_CONFIG);
}

export function testChainClientFactory() {
    return new ChainClientFactory(
        TESTNET_CONFIG,
        new BinanceGasPriceProvider(),
        new EthereumGasPriceProvider(),
        new CreateNewAddressFactory(
            new BinanceChainAddress(TESTNET_CONFIG),
            new EthereumAddress(TESTNET_CONFIG),
        )
    )
}

class DummyGasPriceProvider extends EthereumGasPriceProvider {
    async getGasPrice(): Promise<EthGasPrice> {
        return { high: 1, low: 1, medium: 1} as EthGasPrice;
    }

    getTransactionGas(currency: string, gasPrice: number, currentTargetBalance?: number): number {
        return 1;
    }
}

export function testGanacheClientFactory() {
    return new ChainClientFactory(
        GANACHE_CONFIG,
        new BinanceGasPriceProvider(),
        new DummyGasPriceProvider(),
        new CreateNewAddressFactory(
            new BinanceChainAddress(TESTNET_CONFIG),
            new EthereumAddress(GANACHE_CONFIG),
        )
    )
}
