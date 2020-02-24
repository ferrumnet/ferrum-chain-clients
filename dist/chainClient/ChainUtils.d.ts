import { HexString, Network } from 'ferrum-plumbing';
import { ChainClient, ServerTransaction, SimpleTransferTransaction, EcSignature } from './types';
export declare class ChainUtils {
    static readonly DEFAULT_PENDING_TRANSACTION_SHOW_TIMEOUT = 60000;
    static readonly TX_FETCH_TIMEOUT = 1000;
    static readonly TX_MAXIMUM_WAIT_TIMEOUT: number;
    /**
     * Signs data
     * @return Formatter
     */
    static sign(data: HexString, sk: HexString, forceLow: boolean): EcSignature;
    static addressesAreEqual(network: Network, a1: string, a2: string): boolean;
    static simpleTransactionToServer(tx: SimpleTransferTransaction): ServerTransaction;
    static canonicalAddress(network: Network, address: string): string;
    /**
     *  Converts to bigint, similar to fromWei
     */
    static toDecimalStr(amount: any, decimals: number): string;
    /**
     * Converts a decimal to bigint, similar to toWei
     */
    static toBigIntStr(amount: string | number, decimals: number): string;
    static tokenPart(cur: string): string;
}
export declare function waitForTx(client: ChainClient, transactionId: string, waitTimeout: number, fetchTimeout: number): Promise<SimpleTransferTransaction | undefined>;
export declare function normalizeBnbAmount(amount: string): string;
export declare const BINANCE_DECIMALS = 8;
export declare const ETH_DECIMALS = 18;
//# sourceMappingURL=ChainUtils.d.ts.map