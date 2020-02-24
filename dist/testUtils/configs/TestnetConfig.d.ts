import { MultiChainConfig } from '../../chainClient/types';
import { FullEthereumClient } from "../../chainClient/ethereum/FullEthereumClient";
import { BinanceChainClient } from "../../chainClient/BinanceChainClient";
import { ChainClientFactory } from "../../chainClient/ChainClientFactory";
export declare const TEST_ACCOUNTS: {
    mainAccountSk: string;
    mainAccountAddress: string;
    mainAccountAddressBnb: string;
    secondAccountSk: string;
    secondAccountAddress: string;
};
export declare const TEST_FRM = "0x93698a057cec27508a9157a946e03e277b46fe56";
export declare const TEST_GUSD = "0x056fd409e1d7a124bd7017459dfea2f387b6d5cd";
export declare const TESTNET_CONFIG: MultiChainConfig;
export declare const GANACHE_CONFIG: MultiChainConfig;
export declare function ethereumClientForProd(): FullEthereumClient;
export declare function binanceClientForProd(): BinanceChainClient;
export declare function testChainClientFactory(): ChainClientFactory;
export declare function testGanacheClientFactory(): ChainClientFactory;
//# sourceMappingURL=TestnetConfig.d.ts.map