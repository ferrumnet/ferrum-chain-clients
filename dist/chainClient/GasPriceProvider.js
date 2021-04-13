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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cross_fetch_1 = __importDefault(require("cross-fetch"));
const web3_1 = __importDefault(require("web3"));
const bn_js_1 = __importDefault(require("bn.js"));
const ChainUtils_1 = require("./ChainUtils");
exports.FRM = '0xe5caef4af8780e59df925470b050fb23c43ca68c';
function gweiToEth(gweiNum) {
    return web3_1.default.utils.fromWei(web3_1.default.utils.toWei(new bn_js_1.default(gweiNum), 'gwei'), 'ether');
}
exports.BINANCE_FEE = '0.000375';
exports.BITCOIN_FEE = '0.0001';
exports.BSC_FEE = '0.00000002';
class BscGasPriceProvider {
    getGasPrice() {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                low: exports.BSC_FEE,
                medium: exports.BSC_FEE,
                high: exports.BSC_FEE,
            };
        });
    }
    getTransactionGas(currency, _, __) {
        return exports.BSC_FEE;
    }
    __name__() {
        return 'BscGasPriceProvider';
    }
}
exports.BscGasPriceProvider = BscGasPriceProvider;
class BinanceGasPriceProvider {
    getGasPrice() {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                low: exports.BINANCE_FEE,
                medium: exports.BINANCE_FEE,
                high: exports.BINANCE_FEE,
            };
        });
    }
    getTransactionGas(currency, _, __) {
        return exports.BINANCE_FEE;
    }
    __name__() {
        return 'BinanceGasPriceProvider';
    }
}
exports.BinanceGasPriceProvider = BinanceGasPriceProvider;
class EthereumGasPriceProvider {
    constructor() {
        this.lastUpdate = 0;
    }
    static gasLimiForErc20(currency, balance) {
        const tok = ChainUtils_1.ChainUtils.tokenPart(currency);
        if (Number(balance) === 0) {
            return EthereumGasPriceProvider.ERC_20_GAS_ZERO_ACCOUNT_FOR_CUR[tok] || EthereumGasPriceProvider.ERC_20_GAS_ZERO_ACCOUNT;
        }
        return EthereumGasPriceProvider.ERC_20_GAS_NON_ZERO_ACCOUNT_FOR_CUR[tok] || EthereumGasPriceProvider.ERC_20_GAS_NON_ZERO_ACCOUNT;
    }
    getGasPrice() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.lastUpdate > (Date.now() - EthereumGasPriceProvider.GasTimeout)) {
                return this.lastPrice;
            }
            const res = yield cross_fetch_1.default(EthereumGasPriceProvider.GasStationUrl, {});
            if (res.status >= 400) {
                const txt = yield res.text();
                throw new Error('Error getting gas price: ' + txt);
            }
            const prices = yield res.json();
            this.lastPrice = {
                low: gweiToEth(prices['safeLow'] / 10),
                medium: gweiToEth(prices['average'] / 10),
                high: gweiToEth(prices['fast'] / 10),
            };
            return this.lastPrice;
        });
    }
    getTransactionGas(currency, gasPrice, currentTargetBalance) {
        const tok = ChainUtils_1.ChainUtils.tokenPart(currency);
        const gasAmount = tok === 'ETH' ? EthereumGasPriceProvider.ETH_TX_GAS :
            EthereumGasPriceProvider.gasLimiForErc20(currency, currentTargetBalance || '0');
        return ChainUtils_1.ChainUtils.toDecimalStr(new bn_js_1.default(gasAmount)
            .mul(new bn_js_1.default(ChainUtils_1.ChainUtils.toBigIntStr(gasPrice, ChainUtils_1.ETH_DECIMALS))).toString(), ChainUtils_1.ETH_DECIMALS);
    }
    __name__() {
        return 'GasPriceProvider';
    }
}
exports.EthereumGasPriceProvider = EthereumGasPriceProvider;
EthereumGasPriceProvider.GasStationUrl = 'https://ethgasstation.info/json/ethgasAPI.json';
EthereumGasPriceProvider.GasTimeout = 30000;
EthereumGasPriceProvider.ETH_TX_GAS = 21000;
EthereumGasPriceProvider.ERC_20_GAS_ZERO_ACCOUNT = 150000; // TODO: Adjust based on previous transactoins
EthereumGasPriceProvider.ERC_20_GAS_NON_ZERO_ACCOUNT = 80000;
EthereumGasPriceProvider.ERC_20_GAS_ZERO_ACCOUNT_FOR_CUR = {
    FRM: 52595,
};
EthereumGasPriceProvider.ERC_20_GAS_NON_ZERO_ACCOUNT_FOR_CUR = {
    FRM: 36693,
};
//# sourceMappingURL=GasPriceProvider.js.map