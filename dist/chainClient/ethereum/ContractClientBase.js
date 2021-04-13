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
class ContractClientBase {
    constructor(client, contract, abi) {
        this.client = client;
        this.contract = contract;
        this.abi = abi;
    }
    call(methodFun) {
        return __awaiter(this, void 0, void 0, function* () {
            const web3 = this.web3();
            let erc20Contract = new web3.eth.Contract(abi.abi, this.contract);
            return yield methodFun(erc20Contract.methods).call();
        });
    }
    estimateGas(from, methodFun) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const web3 = this.web3();
                let erc20Contract = new web3.eth.Contract(abi.abi, this.contract);
                return yield methodFun(erc20Contract.methods).estimateGas({ from });
            }
            catch (e) {
                return 0; // Could not estimate the gas
            }
        });
    }
    web3() {
        return this.client.web3();
    }
}
exports.ContractClientBase = ContractClientBase;
//# sourceMappingURL=ContractClientBase.js.map