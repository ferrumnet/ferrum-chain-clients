import { ChainHistoryClient, SimpleTransferTransaction } from "../types";
import { Injectable, LoggerFactory, Network } from "ferrum-plumbing";
export declare class EtherScanHistoryClient implements ChainHistoryClient, Injectable {
    private network;
    private readonly log;
    private readonly urlTemplate;
    private lastCall;
    constructor(apiKey: string, network: Network, logFac: LoggerFactory);
    __name__(): string;
    providesHistory(): Boolean;
    getNonBlockTransactions(fromBlock: number, toBlock: number, filter: any): Promise<SimpleTransferTransaction[]>;
    getTransactionsForAddress(address: string, fromBlock: number, toBlock: number, filter: any): Promise<SimpleTransferTransaction[]>;
    private parseTxs;
    private api;
    private throttle;
}
/**
 NORMAL
 {"blockNumber":"65204","timeStamp":"1439232889",
 "hash":"0x98beb27135aa0a25650557005ad962919d6a278c4b3dde7f4f6a3a1e65aa746c",
 "nonce":"0","blockHash":"0x373d339e45a701447367d7b9c7cef84aab79c2b2714271b908cda0ab3ad0849b",
 "transactionIndex":"0","from":"0x3fb1cd2cd96c6d5c0b5eb3322d807b34482481d4",
 "to":"0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae",
 "value":"0","gas":"122261","gasPrice":"50000000000",
 "isError":"0","txreceipt_status":"",
 "input":"0xf00d4...",
 "contractAddress":"",
 "cumulativeGasUsed":"122207","gasUsed":"122207","confirmations":"10035168"},
 
 INTERNAL
    {"blockNumber":"50107",
    "timeStamp":"1438984016",
    "hash":"0x3f97c969ddf71f515ce5373b1f8e76e9fd7016611d8ce455881009414301789e",
    "from":"0x109c4f2ccc82c4d77bde15f306707320294aea3f",
    "to":"0x881b0a4e9c55d08e31d8d3c022144d75a454211c",
    "value":"1000000000000000000",
    "contractAddress":"","input":"",
    "type":"call",
    "gas":"2300",
    "gasUsed":"0",
    "traceId":"0",
    "isError":"1",
    "errCode":""}
 */
//# sourceMappingURL=EtherScanHistoryClient.d.ts.map