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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const crypto = __importStar(require("@binance-chain/javascript-sdk/lib/crypto"));
// @ts-ignore
const utils = __importStar(require("@binance-chain/javascript-sdk/lib/utils"));
const web3_1 = __importDefault(require("web3"));
/**
 * Note: Do not directly use this. Instead use ChainClientFactory
 */
class CreateNewAddressFactory {
    constructor(binancaAddress, ethAddress) {
        this.binancaAddress = binancaAddress;
        this.ethAddress = ethAddress;
    }
    create(network) {
        switch (network) {
            case 'BINANCE':
                return this.binancaAddress;
            case 'ETHEREUM':
                return this.ethAddress;
            default:
                throw new Error('CreateNewAddressFactory.create: Network not supported: ' + network);
        }
    }
    __name__() { return 'CreateNewAddressFactory'; }
}
exports.CreateNewAddressFactory = CreateNewAddressFactory;
class BinanceChainAddress {
    constructor(config) {
        this.network = config.networkStage;
    }
    __name__() {
        return 'BinanceChainAddress';
    }
    addressFromSk(sk) {
        return __awaiter(this, void 0, void 0, function* () {
            const pk = crypto.getPublicKeyFromPrivateKey(sk);
            const address = crypto.getAddressFromPrivateKey(sk, this.network === 'prod' ? 'bnb' : 'tbnb');
            // Test
            const testData = utils.sha3(web3_1.default.utils.toHex('TEST DATA'));
            const sign = crypto.generateSignature(testData, sk);
            const verif = crypto.verifySignature(sign, testData, pk);
            if (!verif) {
                const msg = 'CreateNewAddress: Error creating a new address. Could not verify generated signature';
                console.error(msg, sk);
                throw new Error(msg);
            }
            return {
                address: address.toString('hex'),
                network: 'BINANCE',
                privateKeyHex: sk,
            };
        });
    }
    newAddress() {
        return __awaiter(this, void 0, void 0, function* () {
            // Create a new private key
            const sk = crypto.generatePrivateKey();
            return this.addressFromSk(sk);
        });
    }
}
exports.BinanceChainAddress = BinanceChainAddress;
class EthereumAddress {
    constructor(config) {
        this.network = config.networkStage;
        this.provider = config.web3Provider;
        this.web3 = new web3_1.default(new web3_1.default.providers.HttpProvider(this.provider));
    }
    __name__() {
        return 'EthereumAddress';
    }
    addressFromSk(sk) {
        return __awaiter(this, void 0, void 0, function* () {
            const account = this.web3.eth.accounts.privateKeyToAccount(sk);
            const testData = utils.sha3(Buffer.from('TEST DATA').toString('hex')).toString('hex');
            const sign = account.sign(testData);
            const verif = this.web3.eth.accounts.recover(sign);
            if (verif !== account.address) {
                const msg = 'CreateNewAddress: Error creating a new address. Could not verify generated signature';
                console.error(msg, account.privateKey);
                throw new Error(msg);
            }
            return {
                address: account.address,
                network: 'ETHEREUM',
                privateKeyHex: account.privateKey.substr(2),
            };
        });
    }
    newAddress() {
        return __awaiter(this, void 0, void 0, function* () {
            const web3 = new web3_1.default(new web3_1.default.providers.HttpProvider(this.provider));
            return this.addressFromSk(web3.utils.randomHex(32));
        });
    }
}
exports.EthereumAddress = EthereumAddress;
//# sourceMappingURL=CreateNewAddress.js.map