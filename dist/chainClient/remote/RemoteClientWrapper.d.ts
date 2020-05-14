import { ChainClient, EcSignature } from "../types";
import { RemoteSignerClient } from "./RemoteSignerClient";
import { Network } from "ferrum-plumbing";
export declare class RemoteClientWrapper implements ChainClient {
    private client;
    private signer;
    private network;
    constructor(client: ChainClient, signer: RemoteSignerClient, network: Network);
    broadcastTransaction: <T>(transaction: import("../types").SignableTransaction, onTransactionReceipt?: ((txId: string, feeBigInt: string, feeCurrency: string) => void) | undefined, onError?: ((txId: string, e: Error) => void) | undefined) => Promise<string>;
    createPaymentTransaction: (fromAddress: string, targetAddress: string, currency: any, amount: string, gasOverride?: string | import("../types").GasParameters | undefined, memo?: string | undefined, nonce?: number | undefined) => Promise<import("../types").SignableTransaction>;
    feeCurrency: () => string;
    feeDecimals: () => number;
    getBalance: (address: string, currency: string) => Promise<string | undefined>;
    getBlockByNumber: (number: number) => Promise<import("../types").BlockData>;
    getBlockNumber: () => Promise<number>;
    getRecentTransactionsByAddress: (address: string, currencies: string[]) => Promise<import("../types").SimpleTransferTransaction[] | undefined>;
    getTransactionById: (tid: string) => Promise<import("../types").SimpleTransferTransaction | undefined>;
    processPaymentFromPrivateKey: (skHex: string, targetAddress: string, expectedCurrencyElement: any, amount: string) => Promise<string>;
    processPaymentFromPrivateKeyWithGas: (skHex: string, targetAddress: string, currency: any, amount: string, gasOverride: string | import("../types").GasParameters) => Promise<string>;
    signTransaction: <T>(skHex: string, transaction: import("../types").SignableTransaction) => Promise<import("../types").SignableTransaction>;
    waitForTransaction: (tid: string) => Promise<import("../types").SimpleTransferTransaction | undefined>;
    sign(address: string, data: string, forceLow: boolean): Promise<EcSignature>;
}
//# sourceMappingURL=RemoteClientWrapper.d.ts.map