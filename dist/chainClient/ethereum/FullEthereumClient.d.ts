import { EthereumClient } from "../EthereumClient";
import { MultiChainConfig, NetworkStage } from "../types";
import { GasPriceProvider } from "../GasPriceProvider";
import { LoggerFactory } from "ferrum-plumbing";
export declare class FullEthereumClient extends EthereumClient {
    private readonly decimalsCache;
    constructor(networkStage: NetworkStage, config: MultiChainConfig, gasService: GasPriceProvider, logFac: LoggerFactory);
    protected getTokenDecimals(tok: string): Promise<number>;
}
//# sourceMappingURL=FullEthereumClient.d.ts.map