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
    constructor(networkStage, config, gasService, logFac) {
        super(networkStage, config, gasService, logFac);
        this.decimalsCache = new ferrum_plumbing_1.LocalCache();
    }
    getTokenDecimals(tok) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.decimalsCache.getAsync(tok, () => __awaiter(this, void 0, void 0, function* () {
                const client = new Erc20ReaderClient_1.Erc20ReaderClient(this, tok);
                try {
                    return yield client.decimals();
                }
                catch (e) {
                    if (e.toString().indexOf('eturned values aren\'t valid')) {
                        return 0;
                    }
                    console.warn('Error calling decimal on contract', tok, e);
                    throw e;
                }
            }));
        });
    }
}
exports.FullEthereumClient = FullEthereumClient;
//# sourceMappingURL=FullEthereumClient.js.map