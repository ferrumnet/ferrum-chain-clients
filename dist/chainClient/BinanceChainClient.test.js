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
// @ts-ignore
const javascript_sdk_1 = __importDefault(require("@binance-chain/javascript-sdk"));
const BinanceChainClient_1 = require("./BinanceChainClient");
const conf = {
    web3Provider: 'https://rinkeby.infura.io/v3/d7fb8b4b80a04950aac6d835a3c790aa',
    contractAddresses: {
        'FRM': '',
    },
    contractDecimals: {
        'FRM': 6,
    },
    binanceChainUrl: 'https://testnet-dex.binance.org',
    networkStage: 'test',
};
const CURRENCY = 'FRM-410';
test('send tx', () => __awaiter(void 0, void 0, void 0, function* () {
    const client = new BinanceChainClient_1.BinanceChainClient('test', conf);
    const privateKey = 'e0d33c540f7eff1d20a1de049236542fd2d21a365e42e01b0a416f93aa078890';
    const to = 'tbnb136zj94xtalc7tp6pcp73r4zx9csdh8cyn7re2d';
    const currency = 'FRM-410';
    const txId = yield client.processPaymentFromPrivateKey(privateKey, to, currency, 0.001);
    console.log('Sent tx', txId);
}));
test('get tx', () => __awaiter(void 0, void 0, void 0, function* () {
    const txId = 'BFB88A41EB45A657D204FC34660B95DF0B70E3BD2D4CE6E120CA4DF6D87C50F3';
    const client = new BinanceChainClient_1.BinanceChainClient('test', conf);
    const tx = yield client.getTransactionById(txId);
    console.log(tx);
}));
test('get txt for user', () => __awaiter(void 0, void 0, void 0, function* () {
    const address = 'tbnb136zj94xtalc7tp6pcp73r4zx9csdh8cyn7re2d';
    const client = new BinanceChainClient_1.BinanceChainClient('test', conf);
    const tx = yield client.getRecentTransactionsByAddress(address);
    console.log(tx);
}));
test('ppk', () => {
    // const nmonic = process.env.NMN;
    //  const sk = sdk.crypto.getPrivateKeyFromMnemonic(nmonic);
    const sk = process.env.sk;
    const addr = javascript_sdk_1.default.crypto.getAddressFromPrivateKey(sk, 'bnb');
    console.log(addr);
});
test('get balance', () => __awaiter(void 0, void 0, void 0, function* () {
    const address = 'tbnb136zj94xtalc7tp6pcp73r4zx9csdh8cyn7re2d';
    const client = new BinanceChainClient_1.BinanceChainClient('test', conf);
    let bal = yield client.getBalance(address, 'RANDOM_TOK');
    expect(bal).toBeUndefined();
    bal = yield client.getBalance(address, CURRENCY);
    expect(bal).toBeTruthy();
    console.log('Balance was ', bal);
    bal = yield client.getBalance(address, 'BNB');
    expect(bal).toBeTruthy();
    console.log('Balance was ', bal);
}));
//# sourceMappingURL=BinanceChainClient.test.js.map