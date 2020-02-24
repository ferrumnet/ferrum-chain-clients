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
const GasPriceProvider_1 = require("./GasPriceProvider");
test('Can get gas price ', () => __awaiter(void 0, void 0, void 0, function* () {
    const gpp = new GasPriceProvider_1.EthereumGasPriceProvider();
    const price = yield gpp.getGasPrice();
    console.log(price);
    expect(Number(price.high)).toBeGreaterThan(0);
    expect(Number(price.high)).toBeLessThan(1);
    expect(Number(price.low)).toBeGreaterThan(0);
    expect(Number(price.low)).toBeLessThan(1);
    expect(Number(price.low)).toBeGreaterThan(0);
}));
//# sourceMappingURL=GasPriceProvider.test.js.map