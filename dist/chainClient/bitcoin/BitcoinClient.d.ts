import { BlockData, ChainClient, ChainHistoryClient, EcSignature, GasParameters, NetworkStage, SignableTransaction, SimpleTransferTransaction } from "../types";
import { Injectable, LocalCache } from "ferrum-plumbing";
import { CreateNewAddress } from "../CreateNewAddress";
export declare class BitcoinClient implements ChainClient, ChainHistoryClient, Injectable {
    private networkStage;
    private cache;
    private addressGen;
    private readonly network;
    private readonly baseUrl;
    constructor(networkStage: NetworkStage, cache: LocalCache, addressGen: CreateNewAddress);
    __name__(): string;
    broadcastTransaction<T>(transaction: SignableTransaction): Promise<string>;
    createPaymentTransaction(fromAddress: string, targetAddress: string, currency: any, amount: string, gasOverride?: string | GasParameters, memo?: string, nonce?: number): Promise<SignableTransaction>;
    feeCurrency(): string;
    feeDecimals(): number;
    getBalance(address: string, currency: string): Promise<string | undefined>;
    getBlockByNumber(number: number): Promise<BlockData>;
    private getSinglePageBlockByNumber;
    getBlockNumber(): Promise<number>;
    getRecentTransactionsByAddress(address: string, currencies: string[]): Promise<SimpleTransferTransaction[] | undefined>;
    getTransactionById(tid: string): Promise<SimpleTransferTransaction | undefined>;
    createSendData(calls: import("../types").ContractCallRequest[]): Promise<SignableTransaction[]>;
    processPaymentFromPrivateKey(skHex: string, targetAddress: string, currency: any, amount: string): Promise<string>;
    processPaymentFromPrivateKeyWithGas(skHex: string, targetAddress: string, currency: any, amount: string, gasOverride: string | GasParameters): Promise<string>;
    sign(skHex: string, data: string, forceLow: boolean): Promise<EcSignature>;
    signTransaction<T>(skHex: string, transaction: SignableTransaction): Promise<SignableTransaction>;
    waitForTransaction(transactionId: string): Promise<SimpleTransferTransaction | undefined>;
    providesHistory(): Boolean;
    getNonBlockTransactions(fromBlock: number, toBlock: number, filter: any): Promise<SimpleTransferTransaction[]>;
    getTransactionsForAddress(address: string, fromBlock: number, toBlock: number, filter: any): Promise<SimpleTransferTransaction[]>;
    private getUtxos;
    private get;
    private static calcSendUtxos;
    private getGasEstimate;
    private calcFee;
    private static calFeeFromGas;
}
//# sourceMappingURL=BitcoinClient.d.ts.map