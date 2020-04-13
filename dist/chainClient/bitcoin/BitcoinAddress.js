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
const ferrum_crypto_1 = require("ferrum-crypto");
// @ts-ignore
const secp256k1_1 = require("hdkey/lib/secp256k1");
class BitcoinAddress {
    constructor(networkStage) {
        this.addressGen = new ferrum_crypto_1.AddressFromPublicKey();
        this.network = networkStage === 'test' ? 'BITCOIN_TESTNET' : 'BITCOIN';
    }
    __name__() { return 'BitcoinAddress'; }
    addressFromSk(sk) {
        return __awaiter(this, void 0, void 0, function* () {
            const pubkU = ferrum_crypto_1.arrayBufferToHex(secp256k1_1.publicKeyCreate(ferrum_crypto_1.hexToArrayBuffer(sk), false));
            const pubk = ferrum_crypto_1.arrayBufferToHex(secp256k1_1.publicKeyCreate(ferrum_crypto_1.hexToArrayBuffer(sk), true));
            const addr = this.addressGen.forNetwork(this.network, pubk, pubkU);
            return {
                address: addr.addressWithChecksum,
                createdAt: Date.now(),
                network: this.network,
                privateKeyHex: sk,
            };
        });
    }
    newAddress() {
        return this.addressFromSk(ferrum_crypto_1.randomBytes(32));
    }
}
exports.BitcoinAddress = BitcoinAddress;
//# sourceMappingURL=BitcoinAddress.js.map