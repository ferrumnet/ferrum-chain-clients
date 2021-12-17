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
// test('can create new binance address prod', async () => {
//    const bc = new BinanceChainAddress('prod');
//    const addr = await bc.newAddress()
//    console.log('Created new binance address prod', addr);
//    expect(addr.address.length).toBe(42);
//    expect(addr.privateKeyHex.length).toBe(64)
// });
// test('can create new binance address', async () => {
//    const bc = new BinanceChainAddress('test');
//    const addr = await bc.newAddress()
//    console.log('Created new binance address test', addr);
//    expect(addr.address.length).toBe(43);
//    expect(addr.privateKeyHex.length).toBe(64)
// });
test('can create new eth address', () => __awaiter(void 0, void 0, void 0, function* () {
    const bc = new CreateNewAddress_1.EthereumAddress('test');
    const addr = yield bc.newAddress();
    console.log('Created new eth address test', addr);
    expect(addr.address.length).toBe(42);
    expect(addr.privateKeyHex.length).toBe(64);
}));
test('can create new eth address prod', () => __awaiter(void 0, void 0, void 0, function* () {
    const bc = new CreateNewAddress_1.EthereumAddress('prod');
    const addr = yield bc.newAddress();
    console.log('Created new eth address prod', addr);
    expect(addr.address.length).toBe(42);
    expect(addr.privateKeyHex.length).toBe(64);
}));
// test('create address for both eth and bnb from same sk', async () => {
//    const bc = new EthereumAddress('prod');
//    const addr = await bc.newAddress();
//    console.log('Created new eth address prod', addr);
//    const bnb = new BinanceChainAddress('prod');
//    const bnbAddr = await bnb.addressFromSk(addr.privateKeyHex);
//    console.log('Created', {bnbAddr, addr});
//    expect(addr.address.length).toBe(42);
//    expect(addr.privateKeyHex.length).toBe(64)
// })
//# sourceMappingURL=CreateNewAddress.test.js.map