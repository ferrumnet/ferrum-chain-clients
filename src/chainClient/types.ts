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

export interface SimpleTransferTransactionItem {
  address: string; currency: string; amount: string; decimals?: number;
}

export interface SimpleTransferTransaction {
  network: Network;
  fee: string;
  feeCurrency: string;
  feeDecimals?: number;
  fromItems: SimpleTransferTransactionItem[];
  toItems: SimpleTransferTransactionItem[];
  confirmed: boolean;
  failed: boolean;
  confirmationTime: number;
  creationTime: number;
  id: string;
  memo?: string;
  reason?: string;
  singleItem: boolean;
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
  itemType?: string;
}

export interface ServerTransaction {
  transactionType: string;
  items: ServerTransactionItem[];
  id: string;
  network: string;
  transactionId: string;
  creationTime: number;
  receiveTime: number;
  confirmationTime: number;
  isConfirmed: boolean;
  failed: boolean;
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
  web3ProviderRinkeby: string;
  binanceChainUrl: string;
  binanceChainSeedNode: string;
  requiredEthConfirmations?: number;
  pendingTransactionShowTimeout?: number;
}

export const NetworkNativeCurrencies = {
  'ETHEREUM': 'ETHEREUM:ETH',
  'BINANCE': 'BINANCE:BNB',
};

export interface EcSignature {
  r: HexString;
  s: HexString;
  v: number;
}

/**
 * Represents a signable or signed transaction. If signed, signatureHex will have a value, otherwise signableHex will
 * have value.
 */
export interface SignableTransaction {
  transaction: any;
  serializedTransaction: HexString;
  signableHex?: HexString;
  signature?: EcSignature | EcSignature[];
  publicKeyHex?: HexString;
}

export interface GasParameters {
  gasLimit: string;
  gasPrice: string;
}

export interface ChainTransactionSigner {
  sign(skHexOrAddress: HexString, data: HexString, forceLow: boolean): Promise<EcSignature>;
}

export interface ChainClient extends ChainTransactionSigner {
  getTransactionById(tid: string, includePending?: boolean): Promise<SimpleTransferTransaction|undefined>;

  processPaymentFromPrivateKey(skHex: HexString, targetAddress: string, expectedCurrencyElement: any,
                               amount: string): Promise<string>;

  processPaymentFromPrivateKeyWithGas(skHex: HexString, targetAddress: string, currency: any,
                                      amount: string, gasOverride: string | GasParameters): Promise<string>;

  createPaymentTransaction(fromAddress: string, targetAddress: string,
                           currency: any, amount: string,
                           gasOverride?: string | GasParameters, memo?: string, nonce?: number): Promise<SignableTransaction>;

  signTransaction<T>(skHex: HexString, transaction: SignableTransaction): Promise<SignableTransaction>;

  getRecentTransactionsByAddress(address: string, currencies: string[]): Promise<SimpleTransferTransaction[]|undefined>;

  getBalance(address: string, currency: string): Promise<string|undefined>;

  broadcastTransaction<T>(transaction: SignableTransaction): Promise<string>;

  waitForTransaction(tid: string): Promise<SimpleTransferTransaction|undefined>;

  feeCurrency(): string;

  feeDecimals(): number;

  getBlockByNumber(number: number): Promise<BlockData>;

  getBlockNumber(): Promise<number>;
}
