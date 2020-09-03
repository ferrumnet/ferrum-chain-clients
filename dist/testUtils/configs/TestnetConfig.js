"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const GasPriceProvider_1 = require("../../chainClient/GasPriceProvider");
const CreateNewAddress_1 = require("../../chainClient/CreateNewAddress");
const FullEthereumClient_1 = require("../../chainClient/ethereum/FullEthereumClient");
const BinanceChainClient_1 = require("../../chainClient/BinanceChainClient");
const ChainClientFactory_1 = require("../../chainClient/ChainClientFactory");
const BitcoinClient_1 = require("../../chainClient/bitcoin/BitcoinClient");
const ferrum_plumbing_1 = require("ferrum-plumbing");
const BitcoinAddress_1 = require("../../chainClient/bitcoin/BitcoinAddress");
exports.TEST_ACCOUNTS = {
    mainAccountSk: '3C6681B912ABEA03AB2D625759FE38E9BC7301120C13CFA3A3217112A3F2A919',
    mainAccountAddressBtc: '1MK6fMPS2gSV7Gt5iWaTZQV47PvrC7a5jr',
    mainAccountAddressBtcTestnet: 'n1q3xQUQqhsjtPMhS5YqPKhNyPXZ9dbpCZ',
    mainAccountAddress: '0x0D959c295E36c140AB766dC12E21eBBB411Bd611',
    mainAccountAddressBnb: 'tbnb1mm8t4rexcz44wrhxv2ac94lpmjdsjx73jkyhzr',
    secondAccountSk: 'ec2a2b02f465f7e77d1b6128c564748eee8bdca22cce008dbce4e6dc1a44d993',
    secondAccountAddress: '0x8017877A1C06efbc7f444AC709119C1e209F26Ee',
    secondAccountAddressBnb: 'tbnb1qqrk3pj9nyw6sm42eaylnkgym40302fjjqu4pk',
    secondAccountAddressBtcTestnet: 'mfX7AnsMaAk9GMhN2Z3iuHSTT5UYrkWWVK',
};
exports.TEST_FRM = '0x93698a057cec27508a9157a946e03e277b46fe56';
exports.TEST_GUSD = '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd';
const dummyLogFac = new ferrum_plumbing_1.LoggerFactory(n => new ferrum_plumbing_1.ConsoleLogger(n));
exports.TESTNET_CONFIG = {
    binanceChainUrl: 'https://testnet-dex.binance.org',
    networkStage: 'test',
    web3Provider: '',
    etherscanApiKey: '',
    web3ProviderRinkeby: 'https://rinkeby.infura.io/v3/637d6212c3de438c845e2544baad58b7',
    binanceChainSeedNode: 'https://data-seed-pre-0-s3.binance.org',
    requiredEthConfirmations: 0,
};
exports.GANACHE_CONFIG = Object.assign(Object.assign({}, exports.TESTNET_CONFIG), { web3Provider: 'http://localhost:7545', web3ProviderRinkeby: 'http://localhost:7545' });
const TEST_PROD_CONFIG = {
    web3Provider: 'https://mainnet.infura.io/v3/637d6212c3de438c845e2544baad58b7',
    web3ProviderRinkeby: 'https://rinkeby.infura.io/v3/637d6212c3de438c845e2544baad58b7',
    binanceChainUrl: 'https://dex.binance.org',
    etherscanApiKey: '',
    binanceChainSeedNode: '',
    networkStage: 'test',
};
function ethereumClientForProd() {
    return new FullEthereumClient_1.FullEthereumClient('prod', TEST_PROD_CONFIG, new GasPriceProvider_1.EthereumGasPriceProvider(), dummyLogFac);
}
exports.ethereumClientForProd = ethereumClientForProd;
function binanceClientForProd() {
    return new BinanceChainClient_1.BinanceChainClient('prod', TEST_PROD_CONFIG);
}
exports.binanceClientForProd = binanceClientForProd;
function bitcoinClientForProd() {
    return new BitcoinClient_1.BitcoinClient('prod', new ferrum_plumbing_1.LocalCache(), new BitcoinAddress_1.BitcoinAddress('prod'));
}
exports.bitcoinClientForProd = bitcoinClientForProd;
function bitcoinClientForTest() {
    return new BitcoinClient_1.BitcoinClient('test', new ferrum_plumbing_1.LocalCache(), new BitcoinAddress_1.BitcoinAddress('test'));
}
exports.bitcoinClientForTest = bitcoinClientForTest;
function testChainClientFactory() {
    return new ChainClientFactory_1.ChainClientFactory(exports.TESTNET_CONFIG, new GasPriceProvider_1.BinanceGasPriceProvider(), new GasPriceProvider_1.EthereumGasPriceProvider(), new CreateNewAddress_1.CreateNewAddressFactory(), new ferrum_plumbing_1.LoggerFactory(n => new ferrum_plumbing_1.ConsoleLogger(n)));
}
exports.testChainClientFactory = testChainClientFactory;
class DummyGasPriceProvider extends GasPriceProvider_1.EthereumGasPriceProvider {
    getGasPrice() {
        return __awaiter(this, void 0, void 0, function* () {
            const gwei = '0.000000001';
            return { high: gwei, low: gwei, medium: gwei };
        });
    }
    getTransactionGas(currency, gasPrice, currentTargetBalance) {
        return gasPrice;
    }
}
function testGanacheClientFactory() {
    return new ChainClientFactory_1.ChainClientFactory(exports.GANACHE_CONFIG, new GasPriceProvider_1.BinanceGasPriceProvider(), new DummyGasPriceProvider(), new CreateNewAddress_1.CreateNewAddressFactory(), new ferrum_plumbing_1.LoggerFactory(n => new ferrum_plumbing_1.ConsoleLogger(n)));
}
exports.testGanacheClientFactory = testGanacheClientFactory;
//# sourceMappingURL=TestnetConfig.js.map