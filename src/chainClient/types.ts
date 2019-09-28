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
  from: { address: string, currency: string, amount: number };
  to: { address: string, currency: string, amount: number };
  confirmed: boolean;
  failed: boolean;
  confirmationTime: number;
  id: string;
}

export type NetworkStage = 'test' | 'prod';

export interface MultiChainConfig {
  web3Provider: string;
  contractAddresses: { [ k: string ]: string };
  contractDecimals: { [k:string]: number };
  binanceChainUrl: string;
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

  getRecentTransactionsByAddress(address: string): Promise<SimpleTransferTransaction[]|undefined>;

  getBalance(address: string, currency: string): Promise<number|undefined>;

  waitForTransaction(tid: string): Promise<SimpleTransferTransaction|undefined>;

  feeCurrency(): string;
}
