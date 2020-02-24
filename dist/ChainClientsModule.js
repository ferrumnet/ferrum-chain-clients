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
const ChainClientFactory_1 = require("./chainClient/ChainClientFactory");
const GasPriceProvider_1 = require("./chainClient/GasPriceProvider");
const CreateNewAddress_1 = require("./chainClient/CreateNewAddress");
/**
 * You must register the MultiChainConfig outside this module
 */
class ChainClientsModule {
    configAsync(container) {
        return __awaiter(this, void 0, void 0, function* () {
            container.register(ChainClientFactory_1.ChainClientFactory, c => new ChainClientFactory_1.ChainClientFactory(c.get('MultiChainConfig'), c.get(GasPriceProvider_1.BinanceGasPriceProvider), c.get(GasPriceProvider_1.EthereumGasPriceProvider), c.get(CreateNewAddress_1.CreateNewAddressFactory)));
            container.register(GasPriceProvider_1.BinanceGasPriceProvider, c => new GasPriceProvider_1.BinanceGasPriceProvider());
            container.register(GasPriceProvider_1.EthereumGasPriceProvider, c => new GasPriceProvider_1.EthereumGasPriceProvider());
            container.register(CreateNewAddress_1.CreateNewAddressFactory, c => new CreateNewAddress_1.CreateNewAddressFactory());
        });
    }
}
exports.ChainClientsModule = ChainClientsModule;
//# sourceMappingURL=ChainClientsModule.js.map