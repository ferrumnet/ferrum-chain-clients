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
const ethereumjs_util_1 = require("ethereumjs-util");
const buffer_1 = require("buffer");
const ferrum_crypto_1 = require("ferrum-crypto");
const BitcoinAddress_1 = require("./bitcoin/BitcoinAddress");
/**
 * Note: Do not directly use this. Instead use ChainClientFactory
 */
class CreateNewAddressFactory {
    constructor() {
        this.ethAddress = new EthereumAddress('prod');
        this.rinkebyAddress = new EthereumAddress('test');
        this.binance = new BinanceChainAddress('prod');
        this.binanceTestnet = new BinanceChainAddress('test');
        this.bitcoinTestnet = new BitcoinAddress_1.BitcoinAddress('test');
        this.bitcoin = new BitcoinAddress_1.BitcoinAddress('prod');
    }
    create(network) {
        switch (network) {
            case 'BINANCE':
                return this.binance;
            case 'BINANCE_TESTNET':
                return this.binanceTestnet;
            case 'ETHEREUM':
                return this.ethAddress;
            case 'RINKEBY':
                return this.rinkebyAddress;
            case 'BITCOIN':
                return this.bitcoin;
            case 'BITCOIN_TESTNET':
                return this.bitcoinTestnet;
            default:
                throw new Error('CreateNewAddressFactory.create: Network not supported: ' + network);
        }
    }
    __name__() { return 'CreateNewAddressFactory'; }
}
exports.CreateNewAddressFactory = CreateNewAddressFactory;
class BinanceChainAddress {
    constructor(networkStage) {
        this.network = networkStage;
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
                network: this.network === 'test' ? 'BINANCE_TESTNEET' : 'BINANCE',
                privateKeyHex: sk,
                createdAt: Date.now(),
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
    constructor(networkStage) {
        this.network = networkStage;
    }
    __name__() {
        return 'EthereumAddress';
    }
    addressFromSk(sk) {
        return __awaiter(this, void 0, void 0, function* () {
            const skBuf = buffer_1.Buffer.from(sk, 'hex');
            const address = ethereumjs_util_1.privateToAddress(skBuf);
            const testData = buffer_1.Buffer.from(ferrum_crypto_1.sha256sync(buffer_1.Buffer.from('TEST DATA').toString('hex')), 'hex');
            const sign = ethereumjs_util_1.ecsign(testData, skBuf, this.chainId());
            const pubKey = ethereumjs_util_1.ecrecover(testData, sign.v, sign.r, sign.s, this.chainId());
            const verifAddress = ethereumjs_util_1.publicToAddress(pubKey);
            if (verifAddress.toString('hex') !== address.toString('hex')) {
                const msg = 'CreateNewAddress: Error creating a new address. Could not verify generated signature';
                throw new Error(msg);
            }
            return {
                address: '0x' + address.toString('hex'),
                network: this.network === 'prod' ? 'ETHEREUM' : 'RINKEBY',
                privateKeyHex: sk,
                createdAt: Date.now(),
            };
        });
    }
    newAddress() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.addressFromSk(ferrum_crypto_1.randomBytes(32));
        });
    }
    chainId() {
        return this.network === 'prod' ? 1 : 4;
    }
}
exports.EthereumAddress = EthereumAddress;
//# sourceMappingURL=CreateNewAddress.js.map