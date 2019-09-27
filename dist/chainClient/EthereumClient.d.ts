/// <reference types="node" />
import BN from 'bn.js';
import { ChainClient, MultiChainConfig, NetworkStage, SimpleTransferTransaction } from "./types";
export declare class EthereumClient implements ChainClient {
    private networkStage;
    private readonly provider;
    private readonly contractAddresses;
    private readonly decimals;
    private rebalanceOffsets;
    private maxConcurrentBlocks;
    private readonly requiredConfirmations;
    private txWaitTimeout;
    constructor(networkStage: NetworkStage, config: MultiChainConfig);
    feeCurrency(): string;
    findContractInfo(contractAddress: string): {
        name: string;
        address: any;
        decimal: any;
    };
    getTransactionById(tid: string): Promise<SimpleTransferTransaction | undefined>;
    processPaymentFromPrivateKey(sk: Buffer, targetAddress: string, currency: string, amount: number): Promise<string>;
    getBlocksRange(start: number, end: number): number[];
    getBlocksToParse(startBlock: number, endBlock: number, concurrentBlocks: number): number;
    getNumberBlocks(startBlock: number, lastBlock: number, ascending: boolean, rebalanceOffsets: number[]): number[];
    /**
     * Note: This only returns incoming transactions to the given address and only works for ERC20 transactions
     */
    getRecentTransactionsByAddress(address: string): Promise<SimpleTransferTransaction[]>;
    sendTransaction(contractAddress: string, privateKey: Buffer, to: string, amount: BN): Promise<string>;
    getBalance(address: string, currency: string): Promise<number>;
    waitForTransaction(transactionId: string): Promise<SimpleTransferTransaction | undefined>;
    private web3;
}
//# sourceMappingURL=EthereumClient.d.ts.map