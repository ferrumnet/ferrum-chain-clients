import { EthereumClient } from '../../chainClient/EthereumClient';
import { MultiChainConfig } from '../../chainClient/types';
import { ChainClientFactory } from '../..';
export declare const TEST_ACCOUNTS: {
    mainAccountSk: string;
    mainAccountAddress: string;
    mainAccountAddressBnb: string;
};
export declare const TESTNET_CONFIG: MultiChainConfig;
export declare function ethereumClientForProd(): EthereumClient;
export declare function testChainClientFactory(): ChainClientFactory;
//# sourceMappingURL=TestnetConfig.d.ts.map