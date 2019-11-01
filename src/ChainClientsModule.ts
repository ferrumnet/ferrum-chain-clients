import {Container, Module} from "ferrum-plumbing";
import {ChainClientFactory} from "./chainClient/ChainClientFactory";
import {MultiChainConfig} from "./chainClient/types";
import {BinanceGasPriceProvider, EthereumGasPriceProvider} from "./chainClient/GasPriceProvider";
import {BinanceChainAddress, CreateNewAddressFactory, EthereumAddress} from "./chainClient/CreateNewAddress";

/**
 * You must register the MultiChainConfig outside this module
 */
export class ChainClientsModule implements Module {
    async configAsync(container: Container): Promise<void> {
        container.register(ChainClientFactory, c => new ChainClientFactory(
            c.get('MultiChainConfig'),
            c.get(BinanceGasPriceProvider),
            c.get(EthereumGasPriceProvider),
            c.get(CreateNewAddressFactory),));
        container.register(BinanceChainAddress, c => new BinanceChainAddress(c.get('MultiChainConfig')));
        container.register(EthereumAddress, c => new EthereumAddress(c.get('MultiChainConfig')));
        container.register(BinanceGasPriceProvider, c => new BinanceGasPriceProvider());
        container.register(EthereumGasPriceProvider, c => new EthereumGasPriceProvider());
        container.register(CreateNewAddressFactory, c => new CreateNewAddressFactory(
            c.get(BinanceChainAddress),
            c.get(EthereumAddress)));
    }
}