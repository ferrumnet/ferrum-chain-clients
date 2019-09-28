import {EthereumClient} from '../../chainClient/EthereumClient';
import {MultiChainConfig} from '../../chainClient/types';
import {BinanceGasPriceProvider, EthereumGasPriceProvider} from '../../chainClient/GasPriceProvider';
import {ChainClientFactory} from '../..';
import {BinanceChainAddress, CreateNewAddressFactory, EthereumAddress} from '../../chainClient/CreateNewAddress';

export const TEST_ACCOUNTS = {
    mainAccountSk: '3C6681B912ABEA03AB2D625759FE38E9BC7301120C13CFA3A3217112A3F2A919',
    mainAccountAddress: '0x0D959c295E36c140AB766dC12E21eBBB411Bd611',
    mainAccountAddressBnb: '',
};

export const TESTNET_CONFIG = {
    binanceChainUrl: '',
    networkStage: 'test',
    contractAddresses: {
        'FRM': '0x93698a057cec27508a9157a946e03e277b46fe56',
    },
    contractDecimals: {
        'FRM': 6,
    },
    web3Provider: 'https://rinkeby.infura.io/v3/d7fb8b4b80a04950aac6d835a3c790aa',
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
    networkStage: 'test',
} as MultiChainConfig;

export function ethereumClientForProd() {
    return new EthereumClient('prod', TEST_PROD_CONFIG, new EthereumGasPriceProvider());
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
