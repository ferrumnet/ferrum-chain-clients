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
class BinanceChainClient {
    constructor(networkStage, config) {
        this.networkStage = networkStage;
        this.url = config.binanceChainUrl;
        this.txWaitTimeout = config.pendingTransactionShowTimeout || ChainUtils_1.ChainUtils.DEFAULT_PENDING_TRANSACTION_SHOW_TIMEOUT;
    }
    feeCurrency() {
        return 'BNB';
    }
    getBalance(address, currency) {
        return __awaiter(this, void 0, void 0, function* () {
            const bnbClient = new javascript_sdk_1.default(this.url);
            const bal = (yield bnbClient.getBalance(address)) || [];
            const tokenBal = bal.find((b) => b.symbol === currency);
            return tokenBal ? tokenBal.free : undefined;
        });
    }
    getTransactionById(tid) {
        return __awaiter(this, void 0, void 0, function* () {
            const apiUrl = `${this.url}/api/v1/tx/${tid}?format=json`;
            const apiRes = yield this.api(apiUrl);
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
            };
        });
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
            return apiRes.tx.map((tx) => tx.txType === 'TRANSFER' ? {
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
                confirmed: true,
            } : undefined)
                .filter(Boolean);
        });
    }
    api(api) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield cross_fetch_1.default(api);
            if (res.status >= 400) {
                const text = yield res.text();
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
            return ChainUtils_1.waitForTx(this, transactionId, this.txWaitTimeout, ChainUtils_1.ChainUtils.DEFAULT_PENDING_TRANSACTION_SHOW_TIMEOUT);
        });
    }
}
exports.BinanceChainClient = BinanceChainClient;
function normalizeBnbAmount(amount) {
    return Number(amount) / (Math.pow(10, 8));
}
//# sourceMappingURL=BinanceChainClient.js.map