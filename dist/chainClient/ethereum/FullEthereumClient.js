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
const EthereumClient_1 = require("../EthereumClient");
const Erc20ReaderClient_1 = require("./Erc20ReaderClient");
const ferrum_plumbing_1 = require("ferrum-plumbing");
class FullEthereumClient extends EthereumClient_1.EthereumClient {
    constructor(net, config, gasService, logFac) {
        super(net, config, gasService, logFac);
        this.clientCache = new ferrum_plumbing_1.LocalCache();
        this.decimalsCache = new ferrum_plumbing_1.LocalCache();
    }
    getTokenDecimals(tok) {
        return __awaiter(this, void 0, void 0, function* () {
            ferrum_plumbing_1.ValidationUtils.isTrue(!!tok, "'tok' cannot be empty");
            return this.decimalsCache.getAsync(tok, () => __awaiter(this, void 0, void 0, function* () {
                try {
                    const client = yield this.getClient(tok);
                    return yield client.decimals();
                }
                catch (e) {
                    if (e.toString().indexOf('eturned values aren\'t valid')) {
                        console.warn('Returning zero for decimal. ', tok, e);
                        return 0;
                    }
                    console.warn('Error calling decimal on contract', tok, e);
                    throw e;
                }
            }));
        });
    }
    getClient(tok) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.clientCache.getAsync(tok, () => __awaiter(this, void 0, void 0, function* () {
                return new Erc20ReaderClient_1.Erc20ReaderClient(this, tok);
            }));
        });
    }
    erc20GasLimit(currency, from, to, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const tok = currency.split(':')[1];
            const client = yield this.getClient(tok);
            return (yield client.estimateTransferGas(from, to, amount)) || 0;
        });
    }
}
exports.FullEthereumClient = FullEthereumClient;
//# sourceMappingURL=FullEthereumClient.js.map