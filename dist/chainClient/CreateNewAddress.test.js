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
const CreateNewAddress_1 = require("./CreateNewAddress");
test('can create new binance address', () => __awaiter(void 0, void 0, void 0, function* () {
    const bc = new CreateNewAddress_1.BinanceChainAddress({ custom: { networkStage: 'test' } });
    const addr = yield bc.newAddress();
    expect(addr.address.length).toBe(43);
    expect(addr.privateKeyHex.length).toBe(64);
}));
test('can create new eth address', () => __awaiter(void 0, void 0, void 0, function* () {
    const bc = new CreateNewAddress_1.EthereumAddress({ custom: { networkStage: 'test' } });
    const addr = yield bc.newAddress();
    expect(addr.address.length).toBe(40);
    expect(addr.privateKeyHex.length).toBe(64);
}));
//# sourceMappingURL=CreateNewAddress.test.js.map