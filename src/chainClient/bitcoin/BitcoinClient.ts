import {
  BlockData,
  ChainClient,
  ChainHistoryClient,
  EcSignature,
  GasParameters, NetworkStage,
  SignableTransaction,
  SimpleTransferTransaction, SimpleTransferTransactionItem
} from "../types";
import {Injectable, LocalCache, Network, ValidationUtils} from "ferrum-plumbing";
import {ChainUtils, waitForTx} from "../ChainUtils";
import BN from "bn.js";
import {EthereumGasPriceProvider, EthGasPrice, GasPriceProvider} from "../GasPriceProvider";
import * as bitcore from 'bitcore-lib';
import {CreateNewAddress} from "../CreateNewAddress";
import fetch from "cross-fetch";
// @ts-ignore
import {sighash} from 'bitcore-lib/lib/transaction/sighash';
// @ts-ignore
import TransactionSignature from 'bitcore-lib/lib/transaction/signature';
import {arrayBufferToHex} from "ferrum-crypto";
import {PrivateKey} from "bitcore-lib";

const BTC_DECIMALS = 8;
const BITCOIN_TX_FETCH_TIMEOUT = 1000 * 3600;

interface Utxo {
  txid: string;
  vout: number;
  value: string;
  height: number;
  confirmations: number;
}

interface BitcoinTransaction {
  utxos: Utxo[],
  from: string,
  to: string,
  amount: string,
  fee: string,
  change: string,
}

function fromSatoshi(satoshi: string) {
  return ChainUtils.toDecimalStr(satoshi, 8);
}

function toSatoshi(btc: string) {
  return ChainUtils.toBigIntStr(btc, 8);
}

function invertHas(buf: Buffer) {
  return new BN(buf).toArrayLike(Buffer, 'le', 32);
}

function toBitcoreTransaction(x: BitcoinTransaction) {
  const bitcoreUtxos = x.utxos.map(u => ({
    txid: u.txid,
      outputIndex: u.vout,
      satoshis: Number(u.value),
      address: x.from,
      script: bitcore.Script.fromAddress(x.from),
  } as any));

  const toItems = [
    { address: x.to, satoshis: Number(toSatoshi(x.amount)) },
  ];

  if (Number(x.change) > 0) {
    toItems.push({ address: x.from, satoshis: Number(toSatoshi(x.change)) })
  }

  return  new bitcore.Transaction()
    .from(bitcoreUtxos)
    .to(toItems as any, Number(toSatoshi(x.amount)))
    // .change(x.from)
    .fee(Number(toSatoshi(x.fee)));
}

function parseTrezorTx(network: Network, tx: any): SimpleTransferTransaction {
  ValidationUtils.isTrue(!!tx, '"tx" is required');
  const fromItems = (tx.vin || []).map((i: any) => ({
    address: (i.addresses && i.addresses.length === 1) ? i.addresses[0] : '',
    currency: `${network}:BTC`,
    decimals: BTC_DECIMALS,
    amount: fromSatoshi(i.value),
  } as SimpleTransferTransactionItem));
  const toItems = (tx.vout || []).map((i: any) => ({
    amount: fromSatoshi(i.value),
    decimals: BTC_DECIMALS,
    currency: `${network}:BTC`,
    address: i.isAddress ? (i.addresses || ['']) [0] || '' : '',
  } as SimpleTransferTransactionItem));
  return  {
    id: tx.txid,
    fromItems,
    toItems,
    singleItem: fromItems.length === 1 && toItems.length === 1,
    failed: false,
    network,
    creationTime: (tx.blockTime || 0) * 1000,
    confirmationTime: (tx.blockTime || 0) * 1000,
    confirmed: tx.confirmations > 0,
    feeCurrency: `${network}:BTC`,
    memo: '',
    feeDecimals: 8,
    fee: fromSatoshi(tx.fees),
  } as SimpleTransferTransaction;
}

export class BitcoinClient implements ChainClient, GasPriceProvider, ChainHistoryClient, Injectable {
  private readonly network: Network;
  private readonly baseUrl: string;
  constructor(private networkStage: NetworkStage, private cache: LocalCache,
              private addressGen: CreateNewAddress) {
    this.network = this.networkStage === 'test' ? 'BITCOIN_TESTNET' : 'BITCOIN';
    this.baseUrl = this.networkStage === 'test' ? 'https://tbtc2.trezor.io/api/v2/' : 'https://btc2.trezor.io/api/v2/';
  }

  __name__(): string { return 'BitcoinClient'; }

  async broadcastTransaction<T>(transaction: SignableTransaction): Promise<string> {
    const res = await this.get(`sendtx/${transaction.serializedTransaction}`);
    ValidationUtils.isTrue(!!res && res.result,
      'Error sending transaction: No transaction ID was generated');
    return res.result;
  }

  async createPaymentTransaction(fromAddress: string, targetAddress: string,
                           currency: any, amount: string,
                           gasOverride?: string | GasParameters,
                           memo?: string, nonce?: number): Promise<SignableTransaction> {
    ValidationUtils.isTrue(!!fromAddress, '"fromAddress" must be provided');
    ValidationUtils.isTrue(!!targetAddress, '"targetAddress" must be provided');
    ValidationUtils.isTrue(ChainUtils.tokenPart(currency) === 'BTC', 'Invalid currency ' + currency);
    // ValidationUtils.isTrue(!!gasOverride, '"gasOverride" is required');
    const allUtxos = (await this.getUtxos(fromAddress) || []).filter(u => u.confirmations > 0 && Number(u.value) > 0);
    const bal = allUtxos.map(u => new BN(u.value)).reduce((p, c) => p.add(c), new BN(0)) || new BN(0);
    const utxoGasRatio = Math.max(allUtxos.length / 2, 1);
    const overridedGas = gasOverride && (gasOverride as GasParameters).gasPrice ?
      new BN(toSatoshi((gasOverride as GasParameters).gasPrice)).muln(utxoGasRatio) :
      new BN(toSatoshi(gasOverride as string || '0'));
    const fee = gasOverride ? overridedGas : await this.calcFee(utxoGasRatio);
    const satoshis = new BN(toSatoshi(amount));
    const balRequired = fee.add(satoshis);
    ValidationUtils.isTrue(bal.gte(balRequired),
      `Not enough balance (expected ${fromSatoshi(balRequired.toString())} but had ${bal.toString()})`);
    const [utxos, change] = BitcoinClient.calcSendUtxos(allUtxos, satoshis, fee);
    const tx = {
      utxos: utxos,
      amount: amount.toString(),
      fee: fromSatoshi(fee.toString()),
      from: fromAddress,
      to: targetAddress,
      change: fromSatoshi(change.toString()),
    } as BitcoinTransaction;
    const bitcoreTx = toBitcoreTransaction(tx);

    const signables = bitcoreTx.inputs.map((i, idx) =>
      arrayBufferToHex(invertHas(sighash(bitcoreTx, 0x01, idx, i.output!.script))));

    // @ts-ignore
    return { transaction: tx, serializedTransaction: bitcoreTx.serialize({disableIsFullySigned: true, disableDustOutputs: true}),
      signableHex: signables.join(','),
    } as SignableTransaction;
  }

  feeCurrency(): string {
    return this.networkStage === 'test' ? 'BITCOIN_TESTNET:BTC' : 'BITCOIN:BTC';
  }

  feeDecimals(): number {
    return 8;
  }

  async getBalance(address: string, currency: string): Promise<string | undefined> {
    const res = await this.get(`address/${address}?details=basic`);
    if (!res || !res.balance) {
      ValidationUtils.isTrue(res && res.balance,
        '"Error getting balance for address ' + address + ':' + (res || '').toString())
    }
    return fromSatoshi(res.balance || '0');
  }

  async getBlockByNumber(number: number): Promise<BlockData> {
    const [block, totalPages] = await this.getSinglePageBlockByNumber(number, 1);
    for(let p = 2; p <= totalPages; p++) {
      const [moreBlock, _] = await this.getSinglePageBlockByNumber(number, p);
      moreBlock.transactionIds.forEach(tid => block.transactionIds.push(tid));
      moreBlock.transactions!.forEach(t => block.transactions!.push(t));
    }
    return block;
  }

  private async getSinglePageBlockByNumber(number: number, page: number): Promise<[BlockData, number]> {
    let blockData = await this.get(`block/${number}?page=${page}`);
    ValidationUtils.isTrue(blockData && blockData.hash, `Error calling api for block ${number}, no hash in the result`);
    const txs = (blockData.txs || []).map((t: any) => parseTrezorTx(this.network, t));
    const totalPages = blockData.totalPages;
    const block = {
      hash: blockData.hash,
      number: blockData.height,
      timestamp: blockData.time * 1000,
      transactionIds: txs.map((t: SimpleTransferTransaction) => t.id),
      transactions: txs,
    } as BlockData;
    return [block, totalPages];
  }

  async getBlockNumber(): Promise<number> {
    const res = await this.get('/status');
    const bNo = ((res || {}).backend || {}).blocks;
    if (!bNo) {
      ValidationUtils.isTrue(!!bNo, 'Error getting blocks. Bad result' + res.toString())
    }
    return bNo;
  }

  async getRecentTransactionsByAddress(address: string, currencies: string[]): Promise<SimpleTransferTransaction[] | undefined> {
    const res = await this.get(`address/${address}?details=txslight`);
    if (!res || !res.balance) {
      ValidationUtils.isTrue(res && res.balance,
        '"Error getting balance for address ' + address + ':' + (res || '').toString())
    }
    if (res && res.txs) {
      return res.txs.map((t: any) => parseTrezorTx(this.network, t));
    }
    return [];
  }

  async getTransactionById(tid: string): Promise<SimpleTransferTransaction | undefined> {
    const tx = await this.get(`tx/${tid}`);
    if (!tx || !tx.txid) {
      ValidationUtils.isTrue(false, `Error getting transaction ${tid}. Received: ${(tx || '').toString()}`);
    }
    return parseTrezorTx(this.network, tx);
  }

  createSendData(calls: import("../types").ContractCallRequest[]): Promise<SignableTransaction[]> {
    throw new Error("Method not implemented.");
  }

  async processPaymentFromPrivateKey(skHex: string, targetAddress: string, currency: any, amount: string): Promise<string> {
    return this.processPaymentFromPrivateKeyWithGas(skHex, targetAddress, currency, amount,
      await this.getGasEstimate());
  }

  async processPaymentFromPrivateKeyWithGas(skHex: string, targetAddress: string, currency: any, amount: string, gasOverride: string | GasParameters): Promise<string> {
    const addr = await this.addressGen.addressFromSk(skHex);
    const tx = await this.createPaymentTransaction(addr.address, targetAddress, currency, amount, gasOverride);
    const signed = await this.signTransaction(skHex, tx!);
    return this.broadcastTransaction(signed);
  }

  async sign(skHex: string, data: string, forceLow: boolean): Promise<EcSignature> {
    const sig = ChainUtils.sign(data, skHex, true);
    return {
      ...sig,
      publicKeyHex: this.getPublicKeyFromSigOrSk({} as any, skHex),
    }
  }

  async signTransaction<T>(skHex: string, transaction: SignableTransaction): Promise<SignableTransaction> {
    ValidationUtils.isTrue(!!transaction && !!transaction.transaction, 'Transaction must be provided');
    const tx = toBitcoreTransaction(transaction.transaction as any);
    const sigHex: EcSignature[] = [];

    if (transaction.signature && Array.isArray(transaction.signature)) {
      // transaction is already signed. Just apply the signature
      transaction.signature.forEach(s => sigHex.push(s));
    } else if (transaction.signature) {
      sigHex.push(transaction.signature);
    } else {
      ValidationUtils.isTrue(!!transaction.signableHex, 'transaction has no signable hex');
      const sinables = (transaction.signableHex || '').split(',');
      for (const signable of sinables) {
        sigHex.push(await this.sign(skHex, signable, true));
      }
    }
    ValidationUtils.isTrue(sigHex.length === tx.inputs.length, `Wrong number of signatures.
    Expected ${tx.inputs.length}, but got ${sigHex.length}`);
    sigHex.forEach((sig,idx) => {
      // @ts-ignore
      const signature = bitcore.crypto.Signature.fromCompact(Buffer.from(ChainUtils.signatureToHex(sig), 'hex'));
      const publicKeyHex = this.getPublicKeyFromSigOrSk(sig, skHex); 
      const publicKey = new bitcore.PublicKey(publicKeyHex);
      // @ts-ignore
      signature.inputIndex = idx;
      const siggg = new TransactionSignature({
        publicKey,
        prevTxId: tx.inputs[idx].prevTxId,
        outputIndex: tx.inputs[idx].outputIndex,
        inputIndex: idx,
        signature: signature,
        sigtype: 0x01,
      });
      tx.applySignature(siggg);
    });

    // @ts-ignore
    return {...transaction, serializedTransaction: tx.serialize({disableDustOutputs: true})};
  }

  getPublicKeyFromSigOrSk(sig: EcSignature, skHex: string) {
    if (sig.publicKeyHex) {
      return sig.publicKeyHex;
    }
    const sk = new PrivateKey(skHex,
      this.networkStage === 'test' ? bitcore.Networks.testnet : bitcore.Networks.mainnet);
    return sk.publicKey.toBuffer().toString('hex');
  }

  waitForTransaction(transactionId: string): Promise<SimpleTransferTransaction | undefined> {
    return waitForTx(this, transactionId, BITCOIN_TX_FETCH_TIMEOUT,
      ChainUtils.TX_FETCH_TIMEOUT * 10)
  }

  // Chain history client implementation 

  providesHistory(): Boolean {
    return false;
  }

  async getNonBlockTransactions(fromBlock: number, toBlock: number, filter: any): Promise<SimpleTransferTransaction[]> {
    return [];
  }

  async getTransactionsForAddress(address: string, fromBlock: number, toBlock: number, filter: any): Promise<SimpleTransferTransaction[]> {
    throw new Error("Method not implemented.");
  }
  
  async getGasPrice(): Promise<EthGasPrice> {
    const gas = fromSatoshi((await this.calcFee(1)).toString());
      return {
          low: gas,
          medium: gas,
          high: gas,
      };
  }

  getTransactionGas(currency: string, gasPrice: string, __?: string) {
      return gasPrice;
  }

  private async getUtxos(address: string): Promise<Utxo[]> {
    const res = await this.get(`utxo/${address}`) as Utxo[];
    ValidationUtils.isTrue(!!res && res.length !== undefined, 'Invalid resuts for UTXO: ' + res.toString());
    return res;
  }

  private async get(api: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}${api}`);
    if (res.status >= 400) {
      const text = await res.text();
      if (res.status === 404) { // Not found
        return undefined;
      }
      throw new Error(`Error getting api ${api}: ${res.statusText} - ${text}`);
    }
    const j = await res.json();
    if (j.error) {
      throw new Error('Error callin api ' + api + ':' + j.error);
    }
    return j;
  }

  private static calcSendUtxos(utxos: Utxo[] = [], amount: BN, fee: BN): [Utxo[], BN] {
    const usedUtxos = [];
    let sum = new BN(0);
    const total = amount.add(fee);
    for (let i = 0; i < utxos.length; i++) {
      const u = utxos[i];
      usedUtxos.push(u);
      sum.iadd(new BN(u.value));
      if(sum.gte(total)) {
        return [usedUtxos, sum.sub(total)];
      }
    }
    throw new Error(`Not enough balance to calcSendUtxos. Available: ${sum.toString()} needed ${total.toString()}` );
  }

  private async getGasEstimate(): Promise<string> {
    return  this.cache.getAsync('BITCOIN_GAS_PRICE', async () => {
      const res = await this.get('estimatefee/12');
      ValidationUtils.isTrue(res && res.result, "Error estimating fee, no result from api");
      return res.result;
    }, EthereumGasPriceProvider.GasTimeout * 4);
  }

  private async calcFee(utxosCnt: number): Promise<BN> {
    // const gasLimit = (180 * utxosCnt + 2 * 34 + 10 + 40).toString();
    return  new BN(toSatoshi(await this.getGasEstimate())).muln(utxosCnt);
  }
}