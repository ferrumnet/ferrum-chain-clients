import { Injectable, Network } from 'ferrum-plumbing';
import { ChainClient, MultiChainConfig } from "./types";
export declare class ChainClientFactory implements Injectable {
    private localConfig;
    private readonly networkStage;
    constructor(localConfig: MultiChainConfig);
    forNetwork(network: Network): ChainClient;
    __name__(): string;
}
//# sourceMappingURL=ChainClientFactory.d.ts.map