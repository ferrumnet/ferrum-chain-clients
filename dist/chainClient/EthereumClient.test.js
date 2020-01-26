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
const TestnetConfig_1 = require("../testUtils/configs/TestnetConfig");
const ferrum_plumbing_1 = require("ferrum-plumbing");
const ChainUtils_1 = require("./ChainUtils");
const clientFac = TestnetConfig_1.testChainClientFactory();
function ethereumClientForTest() { return clientFac.forNetwork('ETHEREUM'); }
test('send tx', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(100000);
        const client = TestnetConfig_1.ethereumClientForProd();
        // const privateKey = Buffer.from('54A5003FC3849EFA4823EFAE9B33EBD07EDA224C47A81219C9EDAC550C1402A9', 'hex');
        // const to = '0x467502Ef1c444f98349dacdf0223CCb5e2019f36';
        //
        // const txId = await client.processPaymentFromPrivateKey(privateKey, to, 'FRM', 0.001);
        // console.log('Sent tx', txId);
        const data = yield client.getTransactionById('0x9213b0ae343ae6d59a5c396d92afc70c1b535365d256cd786423140f1538ba72');
        expect(data.confirmed).toBe(true);
        console.log('transaction', data);
    });
});
test('toDecimal', () => {
    let v = ChainUtils_1.ChainUtils.toDecimalStr(122020, 0);
    expect(v).toBe('122020.0');
    v = ChainUtils_1.ChainUtils.toDecimalStr(12, 18); // eth
    expect(v).toBe('0.000000000000000012');
    v = ChainUtils_1.ChainUtils.toDecimalStr(12, 18 - 9); // gwei
    expect(v).toBe('0.000000012');
    v = ChainUtils_1.ChainUtils.toDecimalStr(122020, 2);
    expect(v).toBe('1220.20');
    v = ChainUtils_1.ChainUtils.toDecimalStr(122020, 1);
    expect(v).toBe('12202.0');
});
test('toBigInt', () => {
    let v = ChainUtils_1.ChainUtils.toBigIntStr(12.2020, 0);
    expect(v).toBe('12');
    v = ChainUtils_1.ChainUtils.toBigIntStr(12.2020, 2);
    expect(v).toBe('1220');
    v = ChainUtils_1.ChainUtils.toBigIntStr(12.2020, 4);
    expect(v).toBe('122020');
    v = ChainUtils_1.ChainUtils.toBigIntStr(12.2020, 8);
    expect(v).toBe('1220200000');
    v = ChainUtils_1.ChainUtils.toBigIntStr(12.2020, 12);
    expect(v).toBe('12202000000000');
    v = ChainUtils_1.ChainUtils.toBigIntStr(0.000001, 2);
    expect(v).toBe('000');
    v = ChainUtils_1.ChainUtils.toBigIntStr(0.000001, 12);
    expect(v).toBe('0000001000000');
    v = ChainUtils_1.ChainUtils.toBigIntStr('12.2020', 0);
    expect(v).toBe('12');
    v = ChainUtils_1.ChainUtils.toBigIntStr('12.2020', 2);
    expect(v).toBe('1220');
    v = ChainUtils_1.ChainUtils.toBigIntStr('12.2020', 4);
    expect(v).toBe('122020');
    v = ChainUtils_1.ChainUtils.toBigIntStr('12.2020', 8);
    expect(v).toBe('1220200000');
    v = ChainUtils_1.ChainUtils.toBigIntStr('12.2020', 12);
    expect(v).toBe('12202000000000');
    v = ChainUtils_1.ChainUtils.toBigIntStr('0.000001', 2);
    expect(v).toBe('000');
    v = ChainUtils_1.ChainUtils.toBigIntStr('0.000001', 12);
    expect(v).toBe('0000001000000');
});
test('create a new address', () => __awaiter(void 0, void 0, void 0, function* () {
    const addr = yield TestnetConfig_1.testChainClientFactory().newAddress('ETHEREUM').newAddress();
    console.log(addr);
}));
test('send tx with overwritten gas', () => __awaiter(void 0, void 0, void 0, function* () {
    jest.setTimeout(10000000);
    const client = ethereumClientForTest();
    const gas = 0.000333333;
    const txId = yield client.processPaymentFromPrivateKeyWithGas(TestnetConfig_1.TEST_ACCOUNTS.mainAccountSk, TestnetConfig_1.TEST_ACCOUNTS.secondAccountAddress, 'FRM', 10, gas);
    console.log('Submitted tx ', txId, 'with custom gas ', gas);
    const tx = yield client.waitForTransaction(txId);
    console.log('Tx result ', tx);
}));
test('Get transaction BY ID no token transfer', () => __awaiter(void 0, void 0, void 0, function* () {
    const tid = '0x2268da5e389627122707f64b61fb9129a7cb3554117b2f07e75200833e8d7ce9';
    const client = TestnetConfig_1.ethereumClientForProd();
    const tx = yield client.getTransactionById(tid);
    console.log(tx);
}));
test('Get transaction BY ID including token transfer', () => __awaiter(void 0, void 0, void 0, function* () {
    const tid = '0xc80881f0bcee3c53411bf8781665dbb762a0aef4780af0f8868dc7513387ebe3';
    const client = TestnetConfig_1.ethereumClientForProd();
    const tx = yield client.getTransactionById(tid);
    console.log(tx);
    expect(tx).toBeTruthy();
    expect(tx.confirmed).toBe(true);
}));
test('Get transaction BY ID including GUSD transfer', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(1000000);
        const tid = '0x86b022a1ce0a5874d8bbf44bb2dacdca610737a30c6e945eea4d29bb77c44445';
        const client = TestnetConfig_1.ethereumClientForProd();
        const tx = yield client.getTransactionById(tid);
        const server = ChainUtils_1.ChainUtils.simpleTransactionToServer(tx);
        expect(tx).toBeTruthy();
        expect(tx.confirmed).toBe(true);
        expect(tx.from.amount).toBe(0.2);
        expect(Number(server.items[2].amount)).toBe(20);
    });
});
test('Get transaction BY ID including token transfer on testnet', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(1000000);
        const tid = '0xd6bb804504d747508f41e3d3e0e0182714e1937a6eeadaac649e92e073aeb9be';
        const client = ethereumClientForTest();
        const tx = yield client.getTransactionById(tid);
        console.log(tx);
        expect(tx).toBeTruthy();
        expect(tx.confirmed).toBe(true);
    });
});
test('Get failed transaction BY ID including token transfer on testnet', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(1000000);
        const tid = '0x7262ab02ce718d963723be48f6bb10d8507db898f71d751360f64493f219985f';
        const client = ethereumClientForTest();
        const tx = yield client.getTransactionById(tid);
        console.log(tx);
        expect(tx).toBeTruthy();
        expect(tx.confirmed).toBe(false);
        expect(tx.reason).toBeTruthy();
    });
});
test('Get token transactions BY address', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(100000);
        const addr = '0x89a39492ec912c0e3533db88672ecaad7bb92a82';
        const client = TestnetConfig_1.ethereumClientForProd();
        const tx = yield client.getRecentTransactionsByAddress(addr);
        console.log(tx);
    });
});
test('Get balance', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(100000);
        const addr = '0xbebe7881a7253c6c0246fabf4d159d2eb2db58e1';
        const client = TestnetConfig_1.ethereumClientForProd();
        let bal = yield client.getBalance(addr, 'FRM');
        expect(bal).toBeTruthy();
        console.log('Balance is ', bal);
        let err;
        try {
            yield client.getBalance(addr, 'RANDOM_TOK');
        }
        catch (e) {
            err = e;
        }
        expect(err).toBeTruthy();
        bal = yield client.getBalance(addr, 'ETH');
        console.log('Eth balance is ', bal);
        expect(bal).toBeTruthy();
    });
});
test('Get block by number', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(100000);
        const blockNo = 8825650;
        const client = TestnetConfig_1.ethereumClientForProd();
        const block = yield ferrum_plumbing_1.retry(() => __awaiter(this, void 0, void 0, function* () { return yield client.getBlockByNumber(blockNo); }));
        console.log('res', block);
        const ethTx = block.transactions
            .find(t => t.id === '0xf1607bd6deaf6bfed0b15b1a34275ddd5eb65963b7a39dec7489cfb012a08498');
        const usdcTx = block.transactions
            .find(t => t.id === '0x20ff49c41e5f5daea28e02f694ae6a4bbef25b5ee653d2473eaac8cd959c3434');
        console.log(ethTx, usdcTx);
        expect(ethTx.from.amount).toBe(0.04);
        expect(usdcTx.from.amount).toBe(100214618);
        expect(usdcTx.from.currency).toBe('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
    });
});
test('sen eth using ganache', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(100000);
        const clientFact = TestnetConfig_1.testGanacheClientFactory();
        const client = clientFact.forNetwork('ETHEREUM');
        const sk = '6af7f508641153dedc1599547b681ad5770381de8be6bfa1d6f623db6918f49e';
        const fromAddr = '0x0933Ccf2b714008a7F7FE3C227E3435e1682511f';
        const addr = yield clientFact.newAddress('ETHEREUM').newAddress();
        const tid = yield client.processPaymentFromPrivateKey(sk, addr.address, 'ETH', 0.1);
        yield ferrum_plumbing_1.sleep(1000);
        const tx = yield client.waitForTransaction(tid);
        expect(tx.confirmed).toBe(true);
        // Return the money
        const tid2 = yield client.processPaymentFromPrivateKey(addr.privateKeyHex, fromAddr, 'ETH', 0.0991);
        const tx2 = yield client.waitForTransaction(tid2);
        expect(tx2.confirmed).toBe(true);
    });
});
test('Check transaction fee', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(100000);
        const eth = 0.001;
        const gas = 0.0000001;
        const txId = yield sendEth(eth, gas);
        const clientFact = TestnetConfig_1.testGanacheClientFactory();
        const client = clientFact.forNetwork('ETHEREUM');
        const tx = yield client.getTransactionById(txId);
        const serverTx = ChainUtils_1.ChainUtils.simpleTransactionToServer(tx);
        console.log(tx);
        console.log(serverTx);
        console.log(JSON.stringify(serverTx));
    });
});
function sendEth(eth, gas) {
    return __awaiter(this, void 0, void 0, function* () {
        const clientFact = TestnetConfig_1.testGanacheClientFactory();
        const client = clientFact.forNetwork('ETHEREUM');
        const sk = '6af7f508641153dedc1599547b681ad5770381de8be6bfa1d6f623db6918f49e';
        const addr = yield clientFact.newAddress('ETHEREUM').newAddress();
        const tid = yield client.processPaymentFromPrivateKeyWithGas(sk, addr.address, 'ETH', eth, gas);
        yield ferrum_plumbing_1.sleep(1000);
        const tx = yield client.waitForTransaction(tid);
        expect(tx.confirmed).toBe(true);
        return tid;
    });
}
//# sourceMappingURL=EthereumClient.test.js.map