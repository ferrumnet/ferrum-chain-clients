"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ferrum_plumbing_1 = require("ferrum-plumbing");
const cross_fetch_1 = __importDefault(require("cross-fetch"));
// @ts-ignore
const javascript_sdk_1 = __importDefault(require("@binance-chain/javascript-sdk"));
const ChainUtils_1 = require("./ChainUtils");
const BinanceTxParser_1 = require("./binance/BinanceTxParser");
const GasPriceProvider_1 = require("./GasPriceProvider");
class BinanceChainClient {
    constructor(networkStage, config) {
        this.networkStage = networkStage;
        this.url = config.binanceChainUrl;
        this.seedNodeUrl = config.binanceChainSeedNode;
        this.txWaitTimeout = config.pendingTransactionShowTimeout || ChainUtils_1.ChainUtils.DEFAULT_PENDING_TRANSACTION_SHOW_TIMEOUT;
        this.addFeeToRawParsedTx = this.addFeeToRawParsedTx.bind(this);
    }
    feeCurrency() {
        return 'BNB';
    }
    getBalance(address, currency) {
        return __awaiter(this, void 0, void 0, function* () {
            const bnbClient = new javascript_sdk_1.default(this.url);
            const bal = (yield bnbClient.getBalance(address)) || [];
            const tokenBal = bal.find((b) => b.symbol === currency);
            return tokenBal ? Number(tokenBal.free) : undefined;
        });
    }
    getTransactionById(tid) {
        return __awaiter(this, void 0, void 0, function* () {
            const apiUrl = `${this.url}/api/v1/tx/${tid}?format=json`;
            const apiRes = yield this.api(apiUrl);
            if (!apiRes) {
                return undefined;
            }
            ferrum_plumbing_1.ValidationUtils.isTrue(apiRes['code'] === 0, 'API return error: ' + apiRes['log']);
            const tx = apiRes['tx']['value']['msg'][0];
            if (tx['type'] !== 'cosmos-sdk/Send' ||
                tx['value']['inputs'].length !== 1 ||
                tx['value']['outputs'].length !== 1 ||
                tx['value']['inputs'][0]['coins'].length !== 1 ||
                tx['value']['outputs'][0]['coins'].length !== 1) {
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
                    amount: ChainUtils_1.normalizeBnbAmount(input['coins'][0]['amount']),
                    currency: input['coins'][0]['denom'],
                    decimals: ChainUtils_1.BINANCE_DECIMALS,
                },
                to: {
                    address: output['address'],
                    amount: ChainUtils_1.normalizeBnbAmount(output['coins'][0]['amount']),
                    currency: output['coins'][0]['denom'],
                    decimals: ChainUtils_1.BINANCE_DECIMALS,
                },
                fee: ChainUtils_1.normalizeBnbAmount(tx.txFee),
                feeCurrency: 'BNB',
                feeDecimals: ChainUtils_1.BINANCE_DECIMALS,
                confirmed: true,
            };
        });
    }
    processPaymentFromPrivateKeyWithGas(skHex, targetAddress, currency, amount, gasOverride) {
        return this.processPaymentFromPrivateKey(skHex, targetAddress, currency, amount);
    }
    processPaymentFromPrivateKey(sk, targetAddress, currency, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const binanceNetwork = this.networkStage === 'test' ? 'testnet' : 'mainnet';
            console.log('Initializing the binance chain', binanceNetwork, this.url);
            const privateKey = sk;
            const bnbClient = new javascript_sdk_1.default(this.url);
            bnbClient.chooseNetwork(binanceNetwork);
            yield bnbClient.initChain();
            // await sleep(3000);
            bnbClient.setPrivateKey(privateKey);
            const addressFrom = bnbClient.getClientKeyAddress();
            console.log('Chain initialized', binanceNetwork, 'using address ', addressFrom);
            const sequenceURL = `${this.url}/api/v1/account/${addressFrom}/sequence`;
            let sequence = yield this.getSequence(sequenceURL);
            try {
                console.log(`About to execute payment from: ${addressFrom}, to: ${targetAddress}, amount: ${amount} ${currency}`);
                const res = yield bnbClient.transfer(addressFrom, targetAddress, amount, currency, '', sequence);
                if (res.status !== 200) {
                    console.error('Error transfering to ' + targetAddress + ' - ', res);
                    throw new Error('Error transfering to ' + targetAddress + ' - ' + JSON.stringify(res));
                }
                else {
                    const txId = res.result[0].hash;
                    console.log(`Transfer with txid: ${txId}, ${addressFrom}, to: ${targetAddress}, amount: ${amount} ${currency}`);
                    return txId;
                }
            }
            catch (e) {
                console.error('Error submitting Binance transaction.', e);
                throw e;
            }
        });
    }
    getRecentTransactionsByAddress(address) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get all TRANSFER transactions
            // Fetch max 300 items
            const txByAddress = {};
            let offset = 0;
            const limit = 300;
            const url = `${this.url}/api/v1/transactions?address=${address}&txType=TRANSFER&side=RECEIVE&limit=${limit}&offset=${offset}`;
            const apiRes = yield this.api(url);
            if (!apiRes.tx || !apiRes.tx.length) {
                return [];
            }
            return apiRes.tx.map(this.parseTx).filter(Boolean);
        });
    }
    api(api) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield cross_fetch_1.default(api);
            if (res.status >= 400) {
                const text = yield res.text();
                if (res.status === 404) { // Not found
                    return undefined;
                }
                throw new Error(`Error getting api ${api}: ${res.statusText} - ${text}`);
            }
            return res.json();
        });
    }
    getSequence(sequenceURL) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = this.api(sequenceURL);
            return res.sequence || 0;
        });
    }
    waitForTransaction(transactionId) {
        return __awaiter(this, void 0, void 0, function* () {
            return ChainUtils_1.waitForTx(this, transactionId, this.txWaitTimeout, ChainUtils_1.ChainUtils.TX_FETCH_TIMEOUT);
        });
    }
    getBlockByNumberFromSeedNode(number) {
        return __awaiter(this, void 0, void 0, function* () {
            const fullApi = `${this.seedNodeUrl}/block?height=${number}`;
            const res = yield this.callFullApi(fullApi);
            const num_txs = (((res['result'] || {})['block'] || {})['header'] || {})['num_txs'];
            const timestamp = (((res['result'] || {})['block'] || {})['header'] || {})['time'];
            const hash = (((res['result'] || {})['block_meta'] || {})['block_id'] || {})['hash'];
            if (num_txs === undefined) {
                throw new Error(`Error calling '${fullApi}'. Result has no 'num_txs': ${JSON.stringify(res)}`);
            }
            // Above API does not include tx hashes. Query for tx hashes using the tx_search API
            const txsResFullApi = `${this.seedNodeUrl}/tx_search?query="tx.height=${number}"`;
            const txRes = yield this.callFullApi(txsResFullApi);
            const txsEncoded = (txRes['result'] || {})['txs'] || [];
            if (Number(num_txs) !== txsEncoded.length) {
                throw new Error(`Error calling '${fullApi}'. Expected '${num_txs}' transactions but got ${txsEncoded.length}.`);
            }
            const decoded = txsEncoded.map((txe) => BinanceTxParser_1.BinanceTxParser.parseFromHex(Buffer.from(txe['tx'], 'base64').toString('hex'), timestamp, txe['hash']))
                .filter(Boolean)
                .map(this.addFeeToRawParsedTx);
            return {
                transactions: decoded,
                transactionIds: decoded.map((t) => t.id),
                timestamp: Date.parse(timestamp),
                number: number,
                hash,
            };
        });
    }
    getBlockByNumber(number) {
        return __awaiter(this, void 0, void 0, function* () {
            return !!this.seedNodeUrl ? this.getBlockByNumberFromSeedNode(number) :
                this.getBlockByNumberFromApi(number);
        });
    }
    getBlockByNumberFromApi(number) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.callApi('v2/transactions-in-block/' + number);
            const txs = res['tx'] || [];
            const transactions = txs.map(this.parseTx).filter(Boolean);
            return {
                transactions,
                transactionIds: transactions.map((t) => t.id),
                timestamp: 0,
                number: number,
                hash: '',
            };
        });
    }
    getBlockNumber() {
        return __awaiter(this, void 0, void 0, function* () {
            // api/v1/node-info
            const res = yield this.callApi('v1/node-info');
            return res.sync_info.latest_block_height;
        });
    }
    callFullApi(apiUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            const apiRes = yield this.api(apiUrl);
            if (!apiRes) {
                return undefined;
            }
            ferrum_plumbing_1.ValidationUtils.isTrue(apiRes && Object.keys(apiRes).length > 1, 'API return error: ' + apiRes['log']);
            return apiRes;
        });
    }
    callApi(api) {
        return __awaiter(this, void 0, void 0, function* () {
            const apiUrl = `${this.url}/api/${api}?format=json`;
            return this.callFullApi(apiUrl);
        });
    }
    addFeeToRawParsedTx(tx) {
        tx.fee = ChainUtils_1.normalizeBnbAmount(GasPriceProvider_1.BINANCE_FEE.toFixed(12)); // TODO: Fix the raw parser to include the fee
        tx.feeCurrency = this.feeCurrency();
        tx.feeDecimals = ChainUtils_1.BINANCE_DECIMALS;
        return tx;
    }
    parseTx(tx) {
        return tx.txType === 'TRANSFER' ? {
            id: tx.txHash,
            confirmationTime: new Date(tx.timeStamp).getTime(),
            from: {
                address: tx.fromAddr,
                currency: tx.txAsset,
                amount: Number(tx.value),
                decimals: ChainUtils_1.BINANCE_DECIMALS,
            },
            to: {
                address: tx.toAddr,
                currency: tx.txAsset,
                amount: Number(tx.value),
                decimals: ChainUtils_1.BINANCE_DECIMALS,
            },
            fee: ChainUtils_1.normalizeBnbAmount(tx.txFee),
            feeCurrency: 'BNB',
            feeDecimals: ChainUtils_1.BINANCE_DECIMALS,
            confirmed: true,
        } : undefined;
    }
}
exports.BinanceChainClient = BinanceChainClient;
//# sourceMappingURL=BinanceChainClient.js.map