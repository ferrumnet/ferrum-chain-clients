import { Network } from 'ferrum-plumbing';
import { ChainClient } from './types';
export declare class ChainUtils {
    static readonly DEFAULT_PENDING_TRANSACTION_SHOW_TIMEOUT = 60000;
    static readonly TX_FETCH_TIMEOUT = 1000;
    static readonly TX_MAXIMUM_WAIT_TIMEOUT: number;
    static addressesAreEqual(network: Network, a1: string, a2: string): boolean;
    static canonicalAddress(network: Network, address: string): string;
    static bufferToHex(buffer: ArrayBuffer): string;
}
export declare function waitForTx(client: ChainClient, transactionId: string, waitTimeout: number, fetchTimeout: number): Promise<import("./types").SimpleTransferTransaction | undefined>;
//# sourceMappingURL=ChainUtils.d.ts.map