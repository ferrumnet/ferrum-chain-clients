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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const abi = __importStar(require("../../resources/erc20-abi.json"));
const ContractClientBase_1 = require("./ContractClientBase");
const ferrum_plumbing_1 = require("ferrum-plumbing");
const ChainUtils_1 = require("../ChainUtils");
class Erc20ReaderClient extends ContractClientBase_1.ContractClientBase {
    constructor(client, contract) {
        super(client, contract, abi.abi);
    }
    __name__() { return 'Erc20ReaderClient'; }
    decimals() {
        return __awaiter(this, void 0, void 0, function* () {
            return ferrum_plumbing_1.TypeUtils.meomize(this, '_decimals', () => __awaiter(this, void 0, void 0, function* () {
                const dec = yield this.call(m => m.decimals());
                ferrum_plumbing_1.ValidationUtils.isTrue(dec !== undefined, 'Could not read "decimals" for ' + this.contract);
                return dec;
            }));
        });
    }
    name() {
        return __awaiter(this, void 0, void 0, function* () {
            return ferrum_plumbing_1.TypeUtils.meomize(this, '_name', () => this.call(m => m.name()));
        });
    }
    symbol() {
        return __awaiter(this, void 0, void 0, function* () {
            return ferrum_plumbing_1.TypeUtils.meomize(this, '_symbol', () => this.call(m => m.symbol()));
        });
    }
    totalSupply() {
        return __awaiter(this, void 0, void 0, function* () {
            const total = yield ferrum_plumbing_1.TypeUtils.meomize(this, '_totalSupply', () => this.call(m => m.totalSupply()));
            return (yield this.rawToAmount(total));
        });
    }
    balanceOf(address) {
        return __awaiter(this, void 0, void 0, function* () {
            const bal = yield this.call(m => m.balanceOf(address));
            return this.rawToAmount(bal);
        });
    }
    allowance(owner, spender) {
        return __awaiter(this, void 0, void 0, function* () {
            const allow = yield this.call(m => m.allowance(owner, spender));
            return this.rawToAmount(allow);
        });
    }
    rawToAmount(raw) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!raw) {
                return undefined;
            }
            const decimals = yield this.decimals();
            return ChainUtils_1.ChainUtils.toDecimalStr(raw, decimals);
        });
    }
    amountToRaw(amount) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!amount) {
                return undefined;
            }
            const decimals = yield this.decimals();
            return ChainUtils_1.ChainUtils.toBigIntStr(amount, decimals);
        });
    }
}
exports.Erc20ReaderClient = Erc20ReaderClient;
//# sourceMappingURL=Erc20ReaderClient.js.map