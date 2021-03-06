import {Container, Module, LoggerFactory} from "ferrum-plumbing";
import {ChainClientFactory} from "./chainClient/ChainClientFactory";
import {BinanceGasPriceProvider, BscGasPriceProvider, EthereumGasPriceProvider, PolygonGasPriceProvider} from "./chainClient/GasPriceProvider";
import {CreateNewAddressFactory} from "./chainClient/CreateNewAddress";

/**
 * You must register the MultiChainConfig outside this module
 */
export class ChainClientsModule implements Module {
    async configAsync(container: Container): Promise<void> {
        container.register(ChainClientFactory, c => new ChainClientFactory(
            c.get('MultiChainConfig'),
            c.get(BinanceGasPriceProvider),
            c.get(EthereumGasPriceProvider),
            c.get(BscGasPriceProvider),
            c.get(PolygonGasPriceProvider),
            c.get(CreateNewAddressFactory),
            c.get(LoggerFactory),
            ));
        container.register(BinanceGasPriceProvider, c => new BinanceGasPriceProvider());
        container.register(EthereumGasPriceProvider, c => new EthereumGasPriceProvider());
        container.register(CreateNewAddressFactory, c => new CreateNewAddressFactory());
        container.register(BscGasPriceProvider, c => new BscGasPriceProvider());
        container.register(PolygonGasPriceProvider, c => new PolygonGasPriceProvider());
    }
}
