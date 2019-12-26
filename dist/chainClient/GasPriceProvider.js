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
function gweiToEth(gweiNum) {
    return Number(web3_1.default.utils.fromWei(web3_1.default.utils.toWei(new bn_js_1.default(gweiNum), 'gwei'), 'ether'));
}
exports.BINANCE_FEE = 0.000375;
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
    static gasPriceForErc20(currency, balance) {
        if (balance === 0) {
            return EthereumGasPriceProvider.ERC_20_GAS_ZERO_ACCOUNT_FOR_CUR[currency] || EthereumGasPriceProvider.ERC_20_GAS_ZERO_ACCOUNT;
        }
        return EthereumGasPriceProvider.ERC_20_GAS_NON_ZERO_ACCOUNT_FOR_CUR[currency] || EthereumGasPriceProvider.ERC_20_GAS_NON_ZERO_ACCOUNT;
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
        const gasAmount = currency === 'ETH' ? EthereumGasPriceProvider.ETH_TX_GAS :
            EthereumGasPriceProvider.gasPriceForErc20(currency, currentTargetBalance || 0);
        return gasAmount * gasPrice;
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
    'FRM': 52595,
};
EthereumGasPriceProvider.ERC_20_GAS_NON_ZERO_ACCOUNT_FOR_CUR = {
    'FRM': 36693,
};
//# sourceMappingURL=GasPriceProvider.js.map