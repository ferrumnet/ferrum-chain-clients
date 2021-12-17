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
        this.bitcoinTestnet = new BitcoinAddress_1.BitcoinAddress('test');
        this.bitcoin = new BitcoinAddress_1.BitcoinAddress('prod');
    }
    /**
     * Returns the address factory. Defaults to ETH network
     * @param network The network
     * @returns The address factory
     */
    create(network) {
        switch (network) {
            case 'ETHEREUM':
            case 'BSC':
            case 'BSC_TESTNET':
            case 'POLYGON':
            case 'MUMBAI_TESTNET':
                return this.ethAddress;
            case 'RINKEBY':
                return this.rinkebyAddress;
            case 'BITCOIN':
                return this.bitcoin;
            case 'BITCOIN_TESTNET':
                return this.bitcoinTestnet;
            default:
                // Default to EVM 
                return this.ethAddress;
        }
    }
    __name__() { return 'CreateNewAddressFactory'; }
}
exports.CreateNewAddressFactory = CreateNewAddressFactory;
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