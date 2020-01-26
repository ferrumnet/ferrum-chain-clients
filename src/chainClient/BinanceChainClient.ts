import {
    BlockData,
    ChainClient, EcSignature, GasParameters,
    MultiChainConfig,
    NetworkStage,
    SignableTransaction,
    SimpleTransferTransaction
} from './types';
import {HexString, ValidationUtils} from 'ferrum-plumbing';
import fetch from "cross-fetch";
// @ts-ignore
import BnbApiClient, {crypto, Transaction} from '@binance-chain/javascript-sdk';
import {BINANCE_DECIMALS, ChainUtils, normalizeBnbAmount, waitForTx} from './ChainUtils';
import {BinanceTxParser} from "./binance/BinanceTxParser";
import {BINANCE_FEE} from "./GasPriceProvider";
import Big from "big.js"
import {ec} from 'elliptic';
import {sha256sync} from "ferrum-crypto";

const BASENUMBER = Math.pow(10, 8);

export class BinanceChainClient implements ChainClient {
    private readonly url: string;
    private readonly txWaitTimeout: number;
    private seedNodeUrl: string;
    bnbClient: any;
    constructor(private networkStage: NetworkStage, config: MultiChainConfig) {
        this.url = config.binanceChainUrl;
        this.seedNodeUrl = config.binanceChainSeedNode;
        this.txWaitTimeout = config.pendingTransactionShowTimeout || ChainUtils.DEFAULT_PENDING_TRANSACTION_SHOW_TIMEOUT;
        this.addFeeToRawParsedTx = this.addFeeToRawParsedTx.bind(this);
    }
    feeCurrency(): string {
        return 'BNB';
    }

    async getBalance(address: string, currency: string): Promise<number|undefined> {
        const bnbClient = new BnbApiClient(this.url);
        const bal = await bnbClient.getBalance(address) || [];
        const tokenBal = bal.find((b: any) => b.symbol === currency);
        return tokenBal ? Number(tokenBal.free) : undefined;
    }

    async getTransactionById(tid: string): Promise<SimpleTransferTransaction|undefined> {
        const apiUrl = `${this.url}/api/v1/tx/${tid}?format=json`;
        const apiRes = await this.api(apiUrl);
        if (!apiRes) {
            return undefined;
        }
        ValidationUtils.isTrue(apiRes['code'] === 0, 'API return error: ' + apiRes['log']);
        const tx = apiRes['tx']['value']['msg'][0];
        if (tx['type'] !== 'cosmos-sdk/Send' ||
            tx['value']['inputs'].length !== 1 ||
            tx['value']['outputs'].length !== 1 ||
            tx['value']['inputs'][0]['coins'].length !== 1 ||
            tx['value']['outputs'][0]['coins'].length !== 1
        ) {
            console.warn('Unsupported transactions', apiRes);
            return undefined;
        }
        const input = tx['value']['inputs'][0];
        const output = tx['value']['outputs'][0];
        return {
            id: apiRes['hash'],
            confirmationTime: new Date(tx.timeStamp).getTime(),
            from: {
                address: input['address'],
                amount: normalizeBnbAmount(input['coins'][0]['amount']),
                currency: input['coins'][0]['denom'],
                decimals: BINANCE_DECIMALS,
            },
            to: {
                address: output['address'],
                amount: normalizeBnbAmount(output['coins'][0]['amount']),
                currency: output['coins'][0]['denom'],
                decimals: BINANCE_DECIMALS,
            },
            fee: normalizeBnbAmount(tx.txFee),
            feeCurrency: 'BNB',
            feeDecimals: BINANCE_DECIMALS,
            confirmed: true,
        } as SimpleTransferTransaction;
    }

    processPaymentFromPrivateKeyWithGas(skHex: string, targetAddress: string, currency: any,
                                        amount: number, gasOverride: number): Promise<string> {
        return this.processPaymentFromPrivateKey(skHex, targetAddress, currency, amount);
    }

    async createPaymentTransaction(fromAddress: string, targetAddress: string,
                                   asset: any, payAmount: number,
                                   gasOverride?: number | GasParameters,
                                   memo?: string): Promise<SignableTransaction> {
        const bigAmount = new Big(payAmount);
        const amount = Number(bigAmount.mul(BASENUMBER).toString());
        const signMsg = {
            inputs: [{
                address: fromAddress,
                coins: [{
                    amount: amount,
                    denom: asset
                }]
            }],
            outputs: [{
                address: targetAddress,
                coins: [{
                    amount: amount,
                    denom: asset
                }]
            }]
        };
        const msg = this.getMsgFromSignMsg(signMsg);
        const sequenceURL = `${this.url}/api/v1/account/${fromAddress}`;
        let [sequence, accountNumber] = await this.getSequence(sequenceURL);
        const client = await this.getBnbClient();
        const options = {
            account_number: parseInt(accountNumber as any),
            chain_id: client.chainId,
            memo: memo || '',
            msg,
            sequence: parseInt(sequence),
            source: client._source,
            type: msg.msgType,
        };
        const tx = new Transaction(options);
        const signableHex = sha256sync(tx.getSignBytes(signMsg).toString('hex'));
        const serializedTransaction = this.serializeTx(options, signMsg);
        return {
            signableHex,
            transaction: options,
            serializedTransaction,
        } as SignableTransaction;
    }

    async signTransaction<T>(skHex: HexString, transaction: SignableTransaction): Promise<SignableTransaction> {
        ValidationUtils.isTrue(!!transaction.signableHex, 'transaction.signableHex must be provided');
        const signature = await this.sign(skHex, transaction.signableHex!);
        const publicKey = crypto.generatePubKey(Buffer.from(skHex, 'hex'));
        const publicKeyHex = publicKey.encode('hex');
        return {...transaction, signature, publicKeyHex};
    }

    async broadcastTransaction<T>(transaction: SignableTransaction): Promise<string> {
        ValidationUtils.isTrue(!!transaction.signature, 'transaction.signature must be provided');
        ValidationUtils.isTrue(!!transaction.publicKeyHex, 'transaction.publicKeyHex must be provided');
        ValidationUtils.isTrue(!!transaction.serializedTransaction, 'transaction.serializedTransaction must be provided');
        const curve = new ec('secp256k1');
        const publicKey = curve.keyFromPublic(Buffer.from(transaction.publicKeyHex!, 'hex'));
        const txOptions = this.deserializeTx(transaction.serializedTransaction!);
        const r = Buffer.from(transaction.signature!.r, 'hex');
        const s = Buffer.from(transaction.signature!.s, 'hex');
        const signature = Buffer.allocUnsafe(64);
        r.copy(signature, 0);
        s.copy(signature, 32);
        const tx = new Transaction(txOptions);
        tx.addSignature(publicKey.getPublic(), signature);
        try {
            console.log(`About to execute transaction: `, transaction.serializedTransaction);
            const res = await this.bnbClient._broadcastDelegate(tx);
            if (res.status !== 200) {
                console.error('Error executing transaction', transaction.serializedTransaction, res);
                throw new Error('Error executing transaction: ' + JSON.stringify(res));
            } else {
                const txId = res.result[0].hash;
                console.log(`Executed transfer with txid: ${txId}`);
                return txId;
            }
        } catch (e) {
            console.error('Error submitting Binance transaction.', e);
            throw e;
        }
    }

    async sign(skHex: HexString, data: HexString, forceLow: boolean = true): Promise<EcSignature> {
        return ChainUtils.sign(data, skHex, true);
    }

    async processPaymentFromPrivateKey(sk: HexString, targetAddress: string, currency: string, amount: number): Promise<string> {
        const bnbClient = await this.getBnbClient();
        const addressFrom = crypto.getAddressFromPrivateKey(sk, this.networkStage === 'test' ? 'tbnb' : 'bnb');
        const tx = await this.createPaymentTransaction(addressFrom, targetAddress, currency, amount);
        const signedTx = await this.signTransaction(sk, tx);
        return await this.broadcastTransaction(signedTx);
    }

    async _processPaymentFromPrivateKey(sk: HexString, targetAddress: string, currency: string, amount: number): Promise<string> {
        const binanceNetwork = this.networkStage === 'test' ? 'testnet' : 'mainnet';
        console.log('Initializing the binance chain', binanceNetwork, this.url);
        const privateKey = sk;
        const bnbClient = new BnbApiClient(this.url);
        bnbClient.chooseNetwork(binanceNetwork);
        await bnbClient.initChain();
        // await sleep(3000);
        bnbClient.setPrivateKey(privateKey);
        const addressFrom = bnbClient.getClientKeyAddress();
        console.log('Chain initialized', binanceNetwork, 'using address ', addressFrom);

        const sequenceURL = `${this.url}/api/v1/account/${addressFrom}`;
        let [sequence, accountNumber] = await this.getSequence(sequenceURL);

        try {
            console.log(`About to execute payment from: ${addressFrom}, to: ${targetAddress}, amount: ${amount} ${currency}`);
            const res = await bnbClient.transfer(addressFrom, targetAddress, amount, currency, '', sequence);
            if (res.status !== 200) {
                console.error('Error transfering to ' + targetAddress + ' - ', res);
                throw new Error('Error transfering to ' + targetAddress + ' - ' + JSON.stringify(res));
            } else {
                const txId = res.result[0].hash;
                console.log(`Transfer with txid: ${txId}, ${addressFrom}, to: ${targetAddress}, amount: ${amount} ${currency}`);
                return txId;
            }
        } catch (e) {
            console.error('Error submitting Binance transaction.', e);
            throw e;
        }
    }

    async getRecentTransactionsByAddress(address: string): Promise<SimpleTransferTransaction[]|undefined> {
        // Get all TRANSFER transactions
        // Fetch max 300 items
        const txByAddress = {};
        let offset = 0;
        const limit  = 300;
        const url=`${this.url}/api/v1/transactions?address=${address}&txType=TRANSFER&side=RECEIVE&limit=${limit}&offset=${offset}`;
        const apiRes = await this.api(url);
        if (!apiRes.tx || !apiRes.tx.length) { return []; }
        return apiRes.tx.map(this.parseTx).filter(Boolean);
    }

    private async api(api: string) {
        const res = await fetch(api);
        if (res.status >= 400) {
            const text = await res.text();
            if (res.status === 404) { // Not found
                return undefined;
            }
            throw new Error(`Error getting api ${api}: ${res.statusText} - ${text}`);
        }
        return res.json();
    }

    private async getSequence(sequenceURL: string): Promise<[string, string]> {
        const res = await this.api(sequenceURL) as any;
        return [res.sequence || '0', res.account_number || '0'];
    }

    async waitForTransaction(transactionId: string): Promise<SimpleTransferTransaction|undefined> {
        return waitForTx(this, transactionId, this.txWaitTimeout, ChainUtils.TX_FETCH_TIMEOUT);
    }

    async getBlockByNumberFromSeedNode(number: number): Promise<BlockData> {
        const fullApi = `${this.seedNodeUrl}/block?height=${number}`;
        const res = await this.callFullApi(fullApi);
        const num_txs = (((res['result'] || {})['block'] || {})['header'] || {})['num_txs'];
        const timestamp = (((res['result'] || {})['block'] || {})['header'] || {})['time'];
        const hash = (((res['result'] || {})['block_meta'] || {})['block_id'] || {})['hash'];
        if (num_txs === undefined) {
            throw new Error(
                `Error calling '${fullApi}'. Result has no 'num_txs': ${JSON.stringify(res)}`
            );
        }
        // Above API does not include tx hashes. Query for tx hashes using the tx_search API
        const txsResFullApi = `${this.seedNodeUrl}/tx_search?query="tx.height=${number}"`;
        const txRes = await this.callFullApi(txsResFullApi);

        const txsEncoded = (txRes['result'] || {})['txs'] || [];
        if (Number(num_txs) !== txsEncoded.length) {
            throw new Error(
                `Error calling '${fullApi}'. Expected '${num_txs}' transactions but got ${txsEncoded.length}.`
            );
        }
        const confTime = Date.parse(timestamp);
        const decoded = txsEncoded.map((txe: any) =>
            BinanceTxParser.parseFromHex(
                Buffer.from(txe['tx'], 'base64').toString('hex'),
                confTime,
                txe['hash']
                ))
            .filter(Boolean)
            .map(this.addFeeToRawParsedTx);
        return {
            transactions: decoded,
            transactionIds: decoded.map((t: SimpleTransferTransaction) => t.id),
            timestamp: confTime,
            number: number,
            hash,
        };
    }

    async getBlockByNumber(number: number): Promise<BlockData> {
        return !!this.seedNodeUrl ? this.getBlockByNumberFromSeedNode(number) :
            this.getBlockByNumberFromApi(number);
    }

    async getBlockByNumberFromApi(number: number): Promise<BlockData> {
        const res = await this.callApi('v2/transactions-in-block/' + number);
        const txs = res['tx'] || [];
        const transactions = txs.map(this.parseTx).filter(Boolean);
        return {
            transactions,
            transactionIds: transactions.map((t: SimpleTransferTransaction) => t.id),
            timestamp: 0,
            number: number,
            hash: '',
        };
    }

    async getBlockNumber(): Promise<number> {
        // api/v1/node-info
        const res = await this.callApi('v1/node-info');
        return res.sync_info.latest_block_height;
    }

    private async callFullApi(apiUrl: string): Promise<any> {
        const apiRes = await this.api(apiUrl);
        if (!apiRes) {
            return undefined;
        }
        ValidationUtils.isTrue(apiRes && Object.keys(apiRes).length > 1,
            'API return error: ' + apiRes['log']);
        return apiRes;
    }

    private async callApi(api: string): Promise<any> {
        const apiUrl = `${this.url}/api/${api}?format=json`;
        return this.callFullApi(apiUrl);
    }

    private addFeeToRawParsedTx(tx: SimpleTransferTransaction): SimpleTransferTransaction {
        tx.fee = BINANCE_FEE; // TODO: Fix the raw parser to include the fee
        tx.feeCurrency = this.feeCurrency();
        tx.feeDecimals = BINANCE_DECIMALS;
        return tx;
    }

    private parseTx(tx: any) {
        return tx.txType === 'TRANSFER' ? ({
            id: tx.txHash,
            confirmationTime: new Date(tx.timeStamp).getTime(),
            from: {
                address: tx.fromAddr,
                currency: tx.txAsset,
                amount: Number(tx.value),
                decimals: BINANCE_DECIMALS,
            },
            to: {
                address: tx.toAddr,
                currency: tx.txAsset,
                amount: Number(tx.value),
                decimals: BINANCE_DECIMALS,
            },
            fee: normalizeBnbAmount(tx.txFee),
            feeCurrency: 'BNB',
            feeDecimals: BINANCE_DECIMALS,
            confirmed: true, // If you see the transaction it is confirmed!
        } as SimpleTransferTransaction) : undefined;
    }

    private async getBnbClient() {
        if (!this.bnbClient) {
            const binanceNetwork = this.networkStage === 'test' ? 'testnet' : 'mainnet';
            console.log('Initializing the binance chain', binanceNetwork, this.url);
            this.bnbClient = new BnbApiClient(this.url);
            this.bnbClient.chooseNetwork(binanceNetwork);
            await this.bnbClient.initChain();
            // await sleep(3000);
            console.log('Chain initialized', binanceNetwork);
        }
        return this.bnbClient!;
    }

    private serializeTx(options: any, signMsg: any) {
        return  {...options, msg: signMsg}
    }

    private deserializeTx(tx: any) {
        return  {...tx, msg: this.getMsgFromSignMsg(tx['msg'])};
    }

    private getMsgFromSignMsg(signMsg: any) {
        const accCode = crypto.decodeAddress(signMsg.inputs[0].address);
        const toAccCode = crypto.decodeAddress(signMsg.outputs[0].address);
        const amount = signMsg.inputs[0].coins[0].amount;
        const asset = signMsg.inputs[0].coins[0].denom;
        const coin = {
            denom: asset,
            amount: amount,
        };

        return {
            inputs: [{
                address: accCode,
                coins: [coin]
            }],
            outputs: [{
                address: toAccCode,
                coins: [coin]
            }],
            msgType: "MsgSend"
        };
    }
}

