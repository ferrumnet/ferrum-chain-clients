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
const CreateNewAddress_1 = require("../chainClient/CreateNewAddress");
const ChainTransactionProcessor_1 = require("./ChainTransactionProcessor");
const CUR = 'FRM';
const clientFact = TestnetConfig_1.testChainClientFactory();
function testSendTokenInTestnet(network, sendAddr) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = clientFact.forNetwork(network);
        const newAddress = new CreateNewAddress_1.EthereumAddress(TestnetConfig_1.TESTNET_CONFIG);
        const newAddr = yield newAddress.newAddress();
        let initialBal = yield client.getBalance(sendAddr, CUR);
        expect(initialBal).toBeGreaterThan(10);
        // Send some FRM to the new address.
        let addrBal = yield client.getBalance(newAddr.address, CUR);
        expect(addrBal).toBe(0);
        const txId = yield client.processPaymentFromPrivateKey(TestnetConfig_1.TEST_ACCOUNTS.mainAccountSk, newAddr.address, CUR, 10);
        const sendTx = yield client.waitForTransaction(txId);
        expect(sendTx.confirmed).toBe(true);
        addrBal = yield client.getBalance(newAddr.address, CUR);
        expect(addrBal).toBe(10);
        // Sweep
        const tool = new ChainTransactionProcessor_1.ChainTransactionProcessor(clientFact);
        const txs = yield tool.sendTokenUsingSk(network, TestnetConfig_1.TEST_ACCOUNTS.mainAccountSk, newAddr.privateKeyHex, newAddr.address, sendAddr, CUR, 10);
        console.log('tool.sendTokenUsingSk', txs);
        // Send some FRM to the new address.
        addrBal = yield client.getBalance(newAddr.address, CUR);
        expect(addrBal).toBe(0);
    });
}
test('send token in testnet - ethereum', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(10000000);
        // First send some token to a new address, then return it back to us.
        yield testSendTokenInTestnet('ETHEREUM', TestnetConfig_1.TEST_ACCOUNTS.mainAccountAddress);
    });
});
test('send token in testnet - binance', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(10000000);
        // First send some token to a new address, then return it back to us.
        yield testSendTokenInTestnet('BINANCE', TestnetConfig_1.TEST_ACCOUNTS.mainAccountAddressBnb);
    });
});
//# sourceMappingURL=ChainTransactionProcessor.test.js.map