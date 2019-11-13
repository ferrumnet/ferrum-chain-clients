import {HexString, Network} from 'ferrum-plumbing';

interface IDecodedLogEvent {
  name: string;
  type: string;
  value: string;
}

export interface IDecodedLog {
  name: string;
  events: IDecodedLogEvent[];
  address: string;
}

export interface SimpleTransferTransaction {
  network: Network;
  fee: number;
  feeCurrency: string;
  feeDecimals?: number;
  from: { address: string, currency: string, amount: number, decimals?: number };
  to: { address: string, currency: string, amount: number, decimals?: number };
  confirmed: boolean;
  failed: boolean;
  confirmationTime: number;
  id: string;
  memo?: string;
}

/**
 * The transaction structure as understood by the kudi / unifyre server
 */
export interface ServerTransactionItem {
  address: string;
  addressType: string;
  amount: string;
  currency: string;
  fakeAddress: boolean;
}

export interface ServerTransaction {
  transactionType: string;
  items: ServerTransactionItem[];
  id: string;
  transactionId: string;
  creationTime: number;
  receiveTime: number;
  confirmationTime: number;
  isConfirmed: boolean;
  isFailed: boolean;
  transactionData: string;
  notes: string;
  version: number;
  externalFee: string;
  fee: string;
  feeCurrency: string;
}

export interface BlockData {
  hash: string;
  number: number;
  timestamp: number;
  transactionIds: string[];
  transactions?: SimpleTransferTransaction[];
}

export type NetworkStage = 'test' | 'prod';

export interface MultiChainConfig {
  web3Provider: string;
  contractAddresses: { [ k: string ]: string };
  contractDecimals: { [k:string]: number };
  binanceChainUrl: string;
  binanceChainSeedNode: string;
  networkStage: NetworkStage;
  requiredEthConfirmations?: number;
  pendingTransactionShowTimeout?: number;
}

export const NetworkNativeCurrencies = {
  'ETHEREUM': 'ETH',
  'BINANCE': 'BNB',
};

export interface ChainClient {
  getTransactionById(tid: string): Promise<SimpleTransferTransaction|undefined>;

  processPaymentFromPrivateKey(skHex: HexString, targetAddress: string, expectedCurrencyElement: any, amount: number): Promise<string>;

  processPaymentFromPrivateKeyWithGas(skHex: HexString, targetAddress: string, currency: any,
                                      amount: number, gasOverride: number): Promise<string>;

  getRecentTransactionsByAddress(address: string): Promise<SimpleTransferTransaction[]|undefined>;

  getBalance(address: string, currency: string): Promise<number|undefined>;

  waitForTransaction(tid: string): Promise<SimpleTransferTransaction|undefined>;

  feeCurrency(): string;

  getBlockByNumber(number: number): Promise<BlockData>;

  getBlockNumber(): Promise<number>;
}
