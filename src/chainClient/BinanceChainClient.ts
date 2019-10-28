import {BlockData, ChainClient, MultiChainConfig, NetworkStage, SimpleTransferTransaction} from './types';
import {HexString, ValidationUtils} from 'ferrum-plumbing';
import fetch from "cross-fetch";
// @ts-ignore
import BnbApiClient from '@binance-chain/javascript-sdk';
import {ChainUtils, waitForTx} from './ChainUtils';

export class BinanceChainClient implements ChainClient {
    private readonly url: string;
    private readonly txWaitTimeout: number;
    constructor(private networkStage: NetworkStage, config: MultiChainConfig) {
        this.url = config.binanceChainUrl;
        this.txWaitTimeout = config.pendingTransactionShowTimeout || ChainUtils.DEFAULT_PENDING_TRANSACTION_SHOW_TIMEOUT;
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
            from: {
                address: input['address'],
                amount: normalizeBnbAmount(input['coins'][0]['amount']),
                currency: input['coins'][0]['denom'],
            },
            to: {
                address: output['address'],
                amount: normalizeBnbAmount(output['coins'][0]['amount']),
                currency: output['coins'][0]['denom'],
            },

            confirmed: true,
        } as SimpleTransferTransaction;
    }

    processPaymentFromPrivateKeyWithGas(skHex: string, targetAddress: string, currency: any,
                                        amount: number, gasOverride: number): Promise<string> {
        return this.processPaymentFromPrivateKey(skHex, targetAddress, currency, amount);
    }

    async processPaymentFromPrivateKey(sk: HexString, targetAddress: string, currency: string, amount: number): Promise<string> {
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

        const sequenceURL = `${this.url}/api/v1/account/${addressFrom}/sequence`;
        let sequence = await this.getSequence(sequenceURL);

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

    private async getSequence(sequenceURL: string) {
        const res = this.api(sequenceURL) as any;
        return res.sequence || 0;
    }

    async waitForTransaction(transactionId: string): Promise<SimpleTransferTransaction|undefined> {
        return waitForTx(this, transactionId, this.txWaitTimeout, ChainUtils.TX_FETCH_TIMEOUT);
    }

    async getBlockByNumber(number: number): Promise<BlockData> {
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

    private async callApi(api: string): Promise<any> {
        const apiUrl = `${this.url}/api/${api}?format=json`;
        const apiRes = await this.api(apiUrl);
        if (!apiRes) {
            return undefined;
        }
        ValidationUtils.isTrue(apiRes && Object.keys(apiRes).length > 1,
            'API return error: ' + apiRes['log']);
        return apiRes;
    }

    private parseTx(tx: any) {
        return tx.txType === 'TRANSFER' ? ({
            id: tx.txHash,
            confirmationTime: new Date(tx.timeStamp).getTime(),
            from: {
                address: tx.fromAddr,
                currency: tx.txAsset,
                amount: Number(tx.value),
            },
            to: {
                address: tx.toAddr,
                currency: tx.txAsset,
                amount: Number(tx.value),
            },
            fee: Number(tx.txFee),
            confirmed: true, // If you see the transaction it is confirmed!
        } as SimpleTransferTransaction) : undefined;
    }
}

function normalizeBnbAmount(amount: string): number {
    return Number(amount) / (10 ** 8);
}

