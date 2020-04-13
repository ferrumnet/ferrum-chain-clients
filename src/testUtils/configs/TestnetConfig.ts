import {MultiChainConfig} from '../../chainClient/types';
import {
    BinanceGasPriceProvider,
    EthereumGasPriceProvider,
    EthGasPrice,
} from '../../chainClient/GasPriceProvider';
import {CreateNewAddressFactory} from '../../chainClient/CreateNewAddress';
import {FullEthereumClient} from "../../chainClient/ethereum/FullEthereumClient";
import {BinanceChainClient} from "../../chainClient/BinanceChainClient";
import {ChainClientFactory} from "../../chainClient/ChainClientFactory";
import {BitcoinClient} from "../../chainClient/bitcoin/BitcoinClient";
import {LocalCache} from "ferrum-plumbing";
import {BitcoinAddress} from "../../chainClient/bitcoin/BitcoinAddress";

export const TEST_ACCOUNTS = {
    mainAccountSk: '3C6681B912ABEA03AB2D625759FE38E9BC7301120C13CFA3A3217112A3F2A919',
    mainAccountAddressBtc: '1MK6fMPS2gSV7Gt5iWaTZQV47PvrC7a5jr',
    mainAccountAddressBtcTestnet: 'n1q3xQUQqhsjtPMhS5YqPKhNyPXZ9dbpCZ',
    mainAccountAddress: '0x0D959c295E36c140AB766dC12E21eBBB411Bd611',
    mainAccountAddressBnb: 'tbnb1mm8t4rexcz44wrhxv2ac94lpmjdsjx73jkyhzr',
    secondAccountSk: 'ec2a2b02f465f7e77d1b6128c564748eee8bdca22cce008dbce4e6dc1a44d993',
    secondAccountAddress: '0x8017877A1C06efbc7f444AC709119C1e209F26Ee',
    secondAccountAddressBtcTestnet: 'mfX7AnsMaAk9GMhN2Z3iuHSTT5UYrkWWVK',
};

export const TEST_FRM = '0x93698a057cec27508a9157a946e03e277b46fe56';
export const TEST_GUSD = '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd';

export const TESTNET_CONFIG = {
    binanceChainUrl: 'https://testnet-dex.binance.org',
    networkStage: 'test',
    web3Provider: '',
    web3ProviderRinkeby: 'https://rinkeby.infura.io/v3/637d6212c3de438c845e2544baad58b7',
    binanceChainSeedNode: 'https://data-seed-pre-0-s3.binance.org',
    requiredEthConfirmations: 0,
} as MultiChainConfig;

export const GANACHE_CONFIG = {
    ...TESTNET_CONFIG,
    web3Provider: 'http://localhost:7545',
    web3ProviderRinkeby: 'http://localhost:7545',
} as MultiChainConfig;


const TEST_PROD_CONFIG = {
    web3Provider: 'https://mainnet.infura.io/v3/637d6212c3de438c845e2544baad58b7',
    web3ProviderRinkeby: 'https://rinkeby.infura.io/v3/637d6212c3de438c845e2544baad58b7',
    binanceChainUrl: 'https://dex.binance.org',
    binanceChainSeedNode: '',
    networkStage: 'test',
} as MultiChainConfig;

export function ethereumClientForProd() {
    return new FullEthereumClient('prod', TEST_PROD_CONFIG, new EthereumGasPriceProvider());
}

export function binanceClientForProd() {
    return new BinanceChainClient('prod', TEST_PROD_CONFIG);
}

export function bitcoinClientForProd() {
    return new BitcoinClient('prod', new LocalCache(), new BitcoinAddress('prod'));
}

export function bitcoinClientForTest() {
    return new BitcoinClient('test', new LocalCache(), new BitcoinAddress('test'));
}

export function testChainClientFactory() {
    return new ChainClientFactory(
        TESTNET_CONFIG,
        new BinanceGasPriceProvider(),
        new EthereumGasPriceProvider(),
        new CreateNewAddressFactory(),
    )
}

class DummyGasPriceProvider extends EthereumGasPriceProvider {
    async getGasPrice(): Promise<EthGasPrice> {
        const gwei = '0.000000001';
        return { high: gwei, low: gwei, medium: gwei} as EthGasPrice;
    }

    getTransactionGas(currency: string, gasPrice: string, currentTargetBalance?: string): string {
        return gasPrice;
    }
}

export function testGanacheClientFactory() {
    return new ChainClientFactory(
        GANACHE_CONFIG,
        new BinanceGasPriceProvider(),
        new DummyGasPriceProvider(),
        new CreateNewAddressFactory()
    )
}
