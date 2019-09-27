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
const cross_fetch_1 = __importDefault(require("cross-fetch"));
class GasPriceProvider {
    constructor() {
        this.lastUpdate = 0;
    }
    getGasPrice() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.lastUpdate < (Date.now() - GasPriceProvider.GasTimeout)) {
                return this.lastPrice;
            }
            const res = yield cross_fetch_1.default(GasPriceProvider.GasStationUrl, {});
            if (res.status >= 400) {
                const txt = yield res.text();
                throw new Error('Error getting gas price: ' + txt);
            }
            const prices = yield res.json();
            this.lastPrice = {
                low: prices['safeLow'],
                medium: prices['average'],
                high: prices['fast'],
            };
            return this.lastPrice;
        });
    }
}
exports.GasPriceProvider = GasPriceProvider;
GasPriceProvider.GasStationUrl = 'https://ethgasstation.info/json/ethgasAPI.json';
GasPriceProvider.GasTimeout = 30000;
//# sourceMappingURL=GasPriceProvider.js.map