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
const TestnetConfig_1 = require("../../testUtils/configs/TestnetConfig");
const BitcoinAddress_1 = require("./BitcoinAddress");
const bitcore_lib_1 = __importStar(require("bitcore-lib"));
const bn_js_1 = __importDefault(require("bn.js"));
const ChainUtils_1 = require("../ChainUtils");
const ECDSA = bitcore_lib_1.crypto.ECDSA;
test('get btc mainnet transaction', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(100000);
        const txId = 'cfc1133033fe30c6e25d3d52b3a3446918d02625ed7418701599e0f30d94a8d7';
        const client = TestnetConfig_1.bitcoinClientForProd();
        const tx = (yield client.getTransactionById(txId));
        expect(tx.fromItems[0].amount).toBe('0.00131800');
        expect(tx.toItems[0].amount).toBe('0.08675899');
        expect(tx.toItems[0].address).toBe('3LBYDUHNvqm1abLXyELqJmfRVtXFQga94D');
        expect(tx.fee).toBe('0.00075090');
    });
});
test('get block by number', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(100000);
        const client = TestnetConfig_1.bitcoinClientForProd();
        const block = yield client.getBlockByNumber(625554);
        expect(block.transactionIds.length).toBe(1294);
        expect(block.transactions.length).toBe(1294);
    });
});
test('get block by number from testnet', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(100000);
        const client = TestnetConfig_1.bitcoinClientForTest();
        const block = yield client.getBlockByNumber(1697253);
        expect(block.transactionIds.length).toBe(166);
        expect(block.transactions.length).toBe(166);
    });
});
test('get address', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(100000);
        const addr = new BitcoinAddress_1.BitcoinAddress('test');
        const a = yield addr.addressFromSk(TestnetConfig_1.TEST_ACCOUNTS.mainAccountSk);
        expect(a.address).toBe(TestnetConfig_1.TEST_ACCOUNTS.mainAccountAddressBtcTestnet);
        const a1 = yield addr.addressFromSk(TestnetConfig_1.TEST_ACCOUNTS.secondAccountSk);
        expect(a1.address).toBe(TestnetConfig_1.TEST_ACCOUNTS.secondAccountAddressBtcTestnet);
        const addrP = new BitcoinAddress_1.BitcoinAddress('prod');
        const a2 = yield addrP.addressFromSk(TestnetConfig_1.TEST_ACCOUNTS.mainAccountSk);
        expect(a2.address).toBe(TestnetConfig_1.TEST_ACCOUNTS.mainAccountAddressBtc);
    });
});
test('address created from sk matches kudi algorithm', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(100000);
        const addr = new BitcoinAddress_1.BitcoinAddress('prod');
        const a2 = yield addr.addressFromSk('63694c95e509f2252bdb30a266338e1e90feaff0609aa51c0293f11b8e93f053');
        console.log('Created address is', a2);
        expect(a2.address).toBe('1DoRPcwqq5oxAGGBT442gzf9kFmhcNUUXE');
    });
});
test('Send some BTC to someone else', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(100000);
        const client = TestnetConfig_1.bitcoinClientForTest();
        const txId = yield client.processPaymentFromPrivateKeyWithGas(TestnetConfig_1.TEST_ACCOUNTS.mainAccountSk, TestnetConfig_1.TEST_ACCOUNTS.secondAccountAddressBtcTestnet, 'BITCOIN_TESTNET:BTC', '0.00001', '0.00001');
        console.log(txId);
        yield client.waitForTransaction(txId);
    });
});
test('Send some BTC from 2nd to 1st', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(100000);
        const client = TestnetConfig_1.bitcoinClientForTest();
        const txId = yield client.processPaymentFromPrivateKey(TestnetConfig_1.TEST_ACCOUNTS.secondAccountSk, TestnetConfig_1.TEST_ACCOUNTS.mainAccountAddressBtcTestnet, 'BITCOIN_TESTNET:BTC', '0.00001');
        console.log(txId);
    });
});
test('Signature matches bitcore-lib', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(100000);
        const client = TestnetConfig_1.bitcoinClientForTest();
        const tx = yield client.createPaymentTransaction(TestnetConfig_1.TEST_ACCOUNTS.mainAccountAddressBtcTestnet, TestnetConfig_1.TEST_ACCOUNTS.secondAccountAddressBtcTestnet, 'BITCOIN_TESTNET:BTC', '0.00001', '0.00001');
        const toSign = tx.signableHex; // 'fb6d683e8e2f753c580cf4d84d2b0bf483acb47ffc756eb53f359ff05c1eacdf';
        const toSigBuf = Buffer.from(toSign, 'hex');
        const ourSig = yield client.sign(TestnetConfig_1.TEST_ACCOUNTS.mainAccountSk, toSign, true);
        // @ts-ignore
        const sig = bitcore_lib_1.default.crypto.Signature.fromCompact(Buffer.from(ChainUtils_1.ChainUtils.signatureToHex(ourSig), 'hex'));
        const sk = new bitcore_lib_1.PrivateKey(TestnetConfig_1.TEST_ACCOUNTS.mainAccountSk, bitcore_lib_1.default.Networks.testnet);
        const signInv = new bn_js_1.default(toSigBuf).toArrayLike(Buffer, 'le', 32);
        // @ts-ignore
        const theirsSig = ECDSA.sign(signInv, sk, 'little');
        console.log(sig.toString());
        console.log(theirsSig.toString());
        const ourVer = ECDSA.verify(signInv, sig, sk.toPublicKey(), 'little');
        const theirVer = ECDSA.verify(signInv, theirsSig, sk.toPublicKey(), 'little');
        console.log(ourVer, theirVer);
        expect(ourVer).toBe(true);
        expect(theirVer).toBe(true);
    });
});
//# sourceMappingURL=BitcoinClient.test.js.map