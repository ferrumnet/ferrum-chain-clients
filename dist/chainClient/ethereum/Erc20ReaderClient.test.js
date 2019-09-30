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
const TestnetConfig_1 = require("../../testUtils/configs/TestnetConfig");
const Erc20ReaderClient_1 = require("./Erc20ReaderClient");
const clientFac = TestnetConfig_1.testChainClientFactory();
test('Read FRM info', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(100000);
        const ethC = clientFac.forNetwork('ETHEREUM');
        const erc20 = new Erc20ReaderClient_1.Erc20ReaderClient(ethC, TestnetConfig_1.TESTNET_CONFIG.contractAddresses['FRM']);
        const totalSuppy = yield erc20.totalSupply();
        console.log('Total supply', totalSuppy);
        expect(totalSuppy).toBeGreaterThan(1000);
        expect(totalSuppy).toBeLessThan(350000000);
        const symbol = yield erc20.symbol();
        expect(symbol).toBe('FRM');
        const name = yield erc20.name();
        expect(name).toBe('Ferrum Network Test Token');
    });
});
//# sourceMappingURL=Erc20ReaderClient.test.js.map