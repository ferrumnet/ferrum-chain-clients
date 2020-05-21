import { ChainHistoryClient, SimpleTransferTransaction, SimpleTransferTransactionItem } from "../types";
import fetch from 'cross-fetch';
import { Injectable, LoggerFactory, Logger, sleep, Network } from "ferrum-plumbing";
import { ETH_DECIMALS } from "../ChainUtils";
import BN from 'bn.js';

const BASE_URL_TEMPLATE = 'https://{PREFIX}.etherscan.io/api?module=account&action={ACTION}&{ADDRESS_PART}startblock={START_BLOCK}&endblock={END_BLOCK}&sort=asc&apikey={API_KEY}';

const TIME_BETWEEN_CALLS = 250; // 4 calls per second

export class EtherScanHistoryClient implements ChainHistoryClient, Injectable {
    private readonly log: Logger;
    private readonly urlTemplate: string;
    private lastCall: number = 0;
    constructor(apiKey: string, private network: Network, logFac: LoggerFactory) {
        this.log = logFac.getLogger(EtherScanHistoryClient);
        this.urlTemplate = BASE_URL_TEMPLATE.replace('{API_KEY}', apiKey)
        .replace('{PREFIX}', network === 'ETHEREUM' ? 'api' : 'api-rinkeby');
        this.throttle = this.throttle.bind(this);
        this.api = this.api.bind(this);
    }

    __name__() { return 'EtherScanHistoryClient'; }

    providesHistory(): Boolean { return true; }

    async getNonBlockTransactions(fromBlock: number, toBlock: number, filter: any): Promise<SimpleTransferTransaction[]> {
        const res = await this.api('txlistinternal', '', fromBlock.toString(), toBlock.toString());
        return this.parseTxs(res.result || []);
    }

    async getTransactionsForAddress(address: string, fromBlock: number, toBlock: number, filter: any): Promise<SimpleTransferTransaction[]> {
        const res1 = await this.api('txlistinternal', address, fromBlock.toString(), toBlock.toString());
        const res2 = await this.api('tokentx', address, fromBlock.toString(), toBlock.toString());
        const res3 = await this.api('txlist', address, fromBlock.toString(), toBlock.toString());
        const all = this.parseTxs(
            (res3.result || []).concat(res2.result || []).concat(res1.result || [])
            );
        // TODO: merge sort. All are already ascending
        return all;
    }

    private parseTxs(txs: EtherScanTx[]): SimpleTransferTransaction[] {
        // Group transactions.
        const byId: { [id: string]: EtherScanTx[] } = {};
        txs.filter(tx => !!tx.hash).forEach(tx => {
            byId[tx.hash] = (byId[tx.hash] || []).concat([tx]);
        });

        return Object.keys(byId).map(id => {
            const tx = byId[id].find(t => t.type === 'normal') ||
                            byId[id].find(t => t.type === 'erc20') ||
                                byId[id][0];
            const gasPrice = (tx.gasPrice || '0');
            console.log('GAP USED IS ', tx.gasPrice, tx.gasUsed)
            const fee = new BN(tx.gasPrice || '0').muln(Number(tx.gasUsed || '0')).toString();
            return {
                id: tx.hash,
                confirmationTime: Number(tx.timeStamp) * 1000,
                confirmed: tx.isError !== '1',
                failed: tx.isError === '1',
                creationTime: Number(tx.timeStamp) * 1000,
                fee,
                feeCurrency: `${this.network}:ETH`,
                network: this.network,
                singleItem: true,
                feeDecimals: ETH_DECIMALS,
                fromItems: byId[id].map(i => ({
                    address: i.from,
                    amount: i.value,
                    currency: i.type === 'erc20' ? `${this.network}:${i.contractAddress}` : `${this.network}:ETH`,
                    decimals: i.tokenDecimal || ETH_DECIMALS,
                    symbol: i.tokenSymbol,
                } as SimpleTransferTransactionItem)),
                toItems: byId[id].map(i => ({
                    address: i.to,
                    amount: i.value,
                    currency: i.type === 'erc20' ? `${this.network}:${i.contractAddress}` : `${this.network}:ETH`,
                    decimals: i.tokenDecimal || ETH_DECIMALS,
                    symbol: i.tokenSymbol,
                } as SimpleTransferTransactionItem)),
            } as SimpleTransferTransaction;
        });
    }

    private async api(action: string, address: string, fromBlock: string,  toBlock: string): Promise<any> {
        // Load from api
        await this.throttle();
        let fullCommand = this.urlTemplate.replace('{ACTION}', action)
            .replace('{START_BLOCK}', fromBlock)
            .replace('{END_BLOCK}', toBlock)
            .replace('{ADDRESS_PART}', !!address ? `address=${address}&` : '');
        try {
            const res = await fetch(fullCommand);
            if (res.status >= 300) {
                const text = await res.text();
                throw new Error('ApiError' + res.statusText + ' - ' + text);
            }

            const resj = await res.json();
            if (resj.status !== '1' && (resj.message || '').indexOf('No transactions found') < 0) {
                throw new Error('ApiError' + resj.message);
            }
            return resj;
        } catch (e) {
            this.log.error('Error calling api', fullCommand, e);
            throw e;
        }
    }

    private async throttle() {
        const now = Date.now();
        const timePassed = now - this.lastCall;
        if (TIME_BETWEEN_CALLS <= timePassed) {
            this.lastCall = now;
            return;
        }
        await sleep(TIME_BETWEEN_CALLS - timePassed);
        this.lastCall = now;
    }
}


interface EtherScanTx {
    type: 'normal' | 'internal' | 'erc20';
    blockNumber: string;
    timeStamp: string;
    hash: string;
    from: string;
    to: string;
    value: string;
    gas: string;
    gasPrice: string;
    gasUsed: string;
    isError: '0' | '1';
    contractAddress: string;
    confirmations: string;
    tokenDecimal: string;
    tokenSymbol: string;
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
        /*
        ERC-20
            {"blockNumber":"10098780","timeStamp":"1589923555",
            "hash":"0x2e02587de4f7777c0bd711fa46b5bea2b060ecc7ece63502b379f9970d31554c",
            "nonce":"51","blockHash":"0x0a81a26bcf85105a8bdea16db664f89594094ec7affc2ee21ecd714bd1249466",
            "from":"0x6007e7bd26ed2b8eac4b6bab3710ee01e9fdfea9",
            "contractAddress":"0xdac17f958d2ee523a2206206994597c13d831ec7",
            "to":"0x1a5ba2014b220119727071ea8090c956be536429",
            "value":"10000","tokenName":"Tether USD",
            "tokenSymbol":"USDT","tokenDecimal":"6",
            "transactionIndex":"121","gas":"78659","gasPrice":"14520000000",
            "gasUsed":"41185","cumulativeGasUsed":"8025179","input":"deprecated","confirmations":"1110"},
        */