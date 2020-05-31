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
const EtherScanHistoryClient_1 = require("./EtherScanHistoryClient");
const ferrum_plumbing_1 = require("ferrum-plumbing");
const TEST_KEY = 'R1CCBA5638M8B539P8K7B8UPF8IJN52NBJ';
test('Get transactions for address including FRM', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(100000);
        const ethHis = new EtherScanHistoryClient_1.EtherScanHistoryClient(TEST_KEY, 'ETHEREUM', new ferrum_plumbing_1.LoggerFactory(n => new ferrum_plumbing_1.ConsoleLogger(n)));
        const txs = yield ethHis.getTransactionsForAddress('0xa178609bfa90ae975e1bfa07e16e9557f6695962', 10145915, 10145918, '');
        console.log('ALL TXS ARE ', txs.length);
        const thaTx = txs.find(t => t.id === '0xc901fc3bec1484562bd1bcfcd4b3e8443b0fc3ee177d0be69e4db091e1ad6d6c');
        console.log('Token example', thaTx);
        expect(thaTx.fee).toBe('0.001083717100000000');
        expect(thaTx.fromItems.length).toBe(1);
        expect(thaTx.toItems.length).toBe(1);
        expect(thaTx.toItems[0].currency).toBe('ETHEREUM:0xe5caef4af8780e59df925470b050fb23c43ca68c');
        expect(thaTx.toItems[0].address).toBe('0xa178609bfa90ae975e1bfa07e16e9557f6695962');
    });
});
test('Get internal txs', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(100000);
        const ethHis = new EtherScanHistoryClient_1.EtherScanHistoryClient(TEST_KEY, 'ETHEREUM', new ferrum_plumbing_1.LoggerFactory(n => new ferrum_plumbing_1.ConsoleLogger(n)));
        const bl = yield ethHis.getNonBlockTransactions(10105543, 10105544, '');
        console.log('BL', bl);
        expect(bl.length).toBe(26);
        expect(bl[24].fromItems[0].amount).toBe("25000000000000000");
        expect(bl[24].fromItems[1].amount).toBe("25000000000000000");
        expect(bl[24].id).toBe('0x89b31bb8b3df6f2fe8ef232b269e0427bb698f148d916e901ee1eff4a40187c0');
    });
});
test('Get txs for an address', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(100000);
        const ethHis = new EtherScanHistoryClient_1.EtherScanHistoryClient(TEST_KEY, 'ETHEREUM', new ferrum_plumbing_1.LoggerFactory(n => new ferrum_plumbing_1.ConsoleLogger(n)));
        const txs = yield ethHis.getTransactionsForAddress('0xee4B6610DFd531027CA1D641772DaCf640bb7b8D', 0, 10105544, '');
        console.log('ALL TXS ARE ', txs.length);
        const thaTx = txs.find(t => t.id === '0x2e9a76215bffcb9d940808dedd3047ee0a577eddc198ef91836d2f167deeca0a');
        console.log('Internal example', thaTx);
        expect(thaTx.fee).toBe('43345000000000');
        expect(thaTx.fromItems.length).toBe(2);
    });
});
//# sourceMappingURL=EtherScanHistoryClient.test.js.map