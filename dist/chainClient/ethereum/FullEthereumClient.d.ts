import { EthereumClient } from "../EthereumClient";
import { MultiChainConfig } from "../types";
import { GasPriceProvider } from "../GasPriceProvider";
import { LoggerFactory, Network } from "ferrum-plumbing";
export declare class FullEthereumClient extends EthereumClient {
    private readonly clientCache;
    private readonly decimalsCache;
    constructor(net: Network, config: MultiChainConfig, gasService: GasPriceProvider, logFac: LoggerFactory);
    protected getTokenDecimals(tok: string): Promise<number>;
    private getClient;
    protected erc20GasLimit(currency: string, from: string, to: string, amount: string): Promise<number>;
}
//# sourceMappingURL=FullEthereumClient.d.ts.map