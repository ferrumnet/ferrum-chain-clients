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
const TestnetConfig_1 = require("../testUtils/configs/TestnetConfig");
const conf = {
    web3Provider: 'https://rinkeby.infura.io/v3/d7fb8b4b80a04950aac6d835a3c790aa',
    binanceChainUrl: 'https://testnet-dex.binance.org',
    binanceChainSeedNode: 'https://data-seed-pre-0-s3.binance.org',
};
const CURRENCY = 'BINANCE_TESTNET:FRM-410';
test('send tx', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(1000000);
        const client = new BinanceChainClient_1.BinanceChainClient('test', conf);
        const privateKey = 'e0d33c540f7eff1d20a1de049236542fd2d21a365e42e01b0a416f93aa078890';
        const to = 'tbnb136zj94xtalc7tp6pcp73r4zx9csdh8cyn7re2d';
        const currency = 'BINANCE_TESTNET:FRM-410';
        const txId = yield client.processPaymentFromPrivateKey(privateKey, to, currency, '0.001');
        console.log('Sent tx', txId);
    });
});
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
test('ppk', () => __awaiter(void 0, void 0, void 0, function* () {
    // const nmonic = process.env.NMN;
    //  const sk = sdk.crypto.getPrivateKeyFromMnemonic(nmonic);
    const sk = TestnetConfig_1.TEST_ACCOUNTS.mainAccountSk; // process.env.sk;
    const addr = javascript_sdk_1.default.crypto.getAddressFromPrivateKey(sk, 'tbnb');
    console.log(addr);
    const skNew = process.env.PRIVATE_KEY;
    console.log('About to process payment from ', javascript_sdk_1.default.crypto.getAddressFromPrivateKey(skNew, 'tbnb'), skNew);
    const client = TestnetConfig_1.testChainClientFactory();
    const bnbTest = client.forNetwork('BINANCE');
    // const txId = await bnbTest.processPaymentFromPrivateKey(skNew!, TEST_ACCOUNTS.mainAccountAddressBnb,
    //     'FRM-410', 500);
    // const txId = await bnbTest.processPaymentFromPrivateKey(skNew!, TEST_ACCOUNTS.mainAccountAddressBnb, 'BNB', 0.1);
    // console.log('Tx_Id', txId)
}));
test('get balance', () => __awaiter(void 0, void 0, void 0, function* () {
    const address = 'tbnb136zj94xtalc7tp6pcp73r4zx9csdh8cyn7re2d';
    const client = new BinanceChainClient_1.BinanceChainClient('test', conf);
    let bal = yield client.getBalance(address, 'BINANCE_TESTNET:RANDOM_TOK');
    expect(bal).toBeUndefined();
    bal = yield client.getBalance(address, CURRENCY);
    expect(bal).toBeTruthy();
    console.log('Balance was ', bal);
    bal = yield client.getBalance(address, 'BINANCE_TESTNET:BNB');
    expect(bal).toBeTruthy();
    console.log('Balance was ', bal);
}));
test('get block prod', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(1000000);
        // NIH
        const client = TestnetConfig_1.binanceClientForProd();
        const block = yield client.getBlockByNumber(44395899);
        console.log(block);
        const tx = block.transactions[0];
        expect(tx.fromItems[0].amount).toBe('0.00010000');
        expect(tx.fromItems[0].currency).toBe('BINANCE:BNB');
        expect(tx.fee).toBe('0.00037500');
    });
});
test('get block test', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(1000000);
        const client = new BinanceChainClient_1.BinanceChainClient('test', conf);
        const block = yield client.getBlockByNumber(49483308);
        // const block = await client.getBlockByNumber(49483742);
        console.log(block);
        const tx = block.transactions[0];
        expect(tx.fromItems[0].address).toBe('tbnb1zqs84eg34kur74uhs6x6m0ketawgtf4nqcj27j');
        expect(tx.toItems[0].address).toBe('tbnb189az9plcke2c00vns0zfmllfpfdw67dtv25kgx');
        expect(tx.fromItems[0].amount).toBe('0.00000001');
        expect(tx.toItems[0].amount).toBe('0.00000001');
        expect(tx.fromItems[0].currency).toBe('BINANCE_TESTNET:BNB');
        expect(tx.fee).toBe('0.000375');
        expect(tx.memo).toBe('Test transaction');
    });
});
//# sourceMappingURL=BinanceChainClient.test.js.map