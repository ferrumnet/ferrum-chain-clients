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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const ferrum_plumbing_1 = require("ferrum-plumbing");
const cross_fetch_1 = __importDefault(require("cross-fetch"));
// @ts-ignore
const javascript_sdk_1 = __importStar(require("@binance-chain/javascript-sdk"));
const ChainUtils_1 = require("./ChainUtils");
const BinanceTxParser_1 = require("./binance/BinanceTxParser");
const GasPriceProvider_1 = require("./GasPriceProvider");
const elliptic_1 = require("elliptic");
const ferrum_crypto_1 = require("ferrum-crypto");
class BinanceChainClient {
    constructor(networkStage, config) {
        this.networkStage = networkStage;
        this.url = config.binanceChainUrl;
        this.seedNodeUrl = config.binanceChainSeedNode;
        this.txWaitTimeout = config.pendingTransactionShowTimeout || ChainUtils_1.ChainUtils.DEFAULT_PENDING_TRANSACTION_SHOW_TIMEOUT;
        this.addFeeToRawParsedTx = this.addFeeToRawParsedTx.bind(this);
        this.getBlockByNumber = this.getBlockByNumber.bind(this);
    }
    network() { return this.networkStage === 'prod' ? 'BINANCE' : 'BINANCE_TESTNET'; }
    feeCurrency() { return this.networkStage === 'prod' ? 'BINANCE:BNB' : 'BINANCE_TESTNET:BNB'; }
    feeDecimals() { return ChainUtils_1.BINANCE_DECIMALS; }
    getBalance(address, currency) {
        return __awaiter(this, void 0, void 0, function* () {
            const bnbClient = new javascript_sdk_1.default(this.url);
            const bal = (yield bnbClient.getBalance(address)) || [];
            const tok = ChainUtils_1.ChainUtils.tokenPart(currency);
            const tokenBal = bal.find((b) => b.symbol === tok);
            return tokenBal ? tokenBal.free : undefined;
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
                network: this.network(),
                confirmationTime: new Date(tx.timeStamp).getTime(),
                fromItems: [{
                        address: input['address'],
                        amount: ChainUtils_1.normalizeBnbAmount(input['coins'][0]['amount']),
                        currency: this.fullCurrency(input['coins'][0]['denom']),
                        decimals: ChainUtils_1.BINANCE_DECIMALS,
                    }],
                toItems: [{
                        address: output['address'],
                        amount: ChainUtils_1.normalizeBnbAmount(output['coins'][0]['amount']),
                        currency: this.fullCurrency(output['coins'][0]['denom']),
                        decimals: ChainUtils_1.BINANCE_DECIMALS,
                    }],
                fee: ChainUtils_1.normalizeBnbAmount(tx.txFee),
                feeCurrency: this.feeCurrency(),
                feeDecimals: ChainUtils_1.BINANCE_DECIMALS,
                confirmed: true,
                singleItem: true,
            };
        });
    }
    processPaymentFromPrivateKeyWithGas(skHex, targetAddress, currency, amount, gasOverride) {
        return this.processPaymentFromPrivateKey(skHex, targetAddress, currency, amount);
    }
    createSendData(calls) {
        throw new Error("Method not implemented.");
    }
    createPaymentTransaction(fromAddress, targetAddress, currency, payAmount, gasOverride, memo, nonce) {
        return __awaiter(this, void 0, void 0, function* () {
            const amount = Number(ChainUtils_1.ChainUtils.toBigIntStr(payAmount, ChainUtils_1.BINANCE_DECIMALS));
            const asset = ChainUtils_1.ChainUtils.tokenPart(currency);
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
            let [sequence, accountNumber] = yield this.getSequence(sequenceURL);
            const client = yield this.getBnbClient();
            const options = {
                account_number: parseInt(accountNumber),
                chain_id: client.chainId,
                memo: memo || '',
                msg,
                sequence: nonce || parseInt(sequence),
                source: client._source,
                type: msg.msgType,
            };
            const tx = new javascript_sdk_1.Transaction(options);
            const signableHex = ferrum_crypto_1.sha256sync(tx.getSignBytes(signMsg).toString('hex'));
            const serializedTransaction = this.serializeTx(options, signMsg);
            return {
                signableHex,
                transaction: options,
                serializedTransaction,
            };
        });
    }
    signTransaction(skHex, transaction) {
        return __awaiter(this, void 0, void 0, function* () {
            ferrum_plumbing_1.ValidationUtils.isTrue(!!transaction.signableHex, 'transaction.signableHex must be provided');
            const signature = yield this.sign(skHex, transaction.signableHex);
            const publicKey = !!signature.publicKeyHex ? undefined : javascript_sdk_1.crypto.generatePubKey(Buffer.from(skHex, 'hex'));
            const publicKeyHex = signature.publicKeyHex || publicKey.encode('hex');
            return Object.assign(Object.assign({}, transaction), { signature, publicKeyHex });
        });
    }
    broadcastTransaction(transaction) {
        return __awaiter(this, void 0, void 0, function* () {
            ferrum_plumbing_1.ValidationUtils.isTrue(!!transaction.signature, 'transaction.signature must be provided');
            ferrum_plumbing_1.ValidationUtils.isTrue(!!transaction.publicKeyHex, 'transaction.publicKeyHex must be provided');
            ferrum_plumbing_1.ValidationUtils.isTrue(!!transaction.serializedTransaction, 'transaction.serializedTransaction must be provided');
            const curve = new elliptic_1.ec('secp256k1');
            const publicKey = curve.keyFromPublic(Buffer.from(transaction.publicKeyHex, 'hex'));
            const txOptions = this.deserializeTx(transaction.serializedTransaction);
            const signature = Buffer.from(ChainUtils_1.ChainUtils.signatureToHexNoV(transaction.signature), 'hex');
            const tx = new javascript_sdk_1.Transaction(txOptions);
            tx.addSignature(publicKey.getPublic(), signature);
            javascript_sdk_1.crypto.verifySignature(signature.toString('hex'), transaction.signableHex, transaction.publicKeyHex);
            try {
                console.log(`About to execute transaction: `, transaction.serializedTransaction);
                const res = yield this.bnbClient.sendRawTransaction(tx.serialize(), true);
                if (res.status !== 200) {
                    console.error('Error executing transaction', transaction.serializedTransaction, res);
                    throw new Error('Error executing transaction: ' + JSON.stringify(res));
                }
                else {
                    const txId = res.result[0].hash;
                    console.log(`Executed transfer with txid: ${txId}`);
                    return txId;
                }
            }
            catch (e) {
                console.error('Error submitting Binance transaction.', e);
                throw e;
            }
        });
    }
    sign(skHex, data, forceLow = true) {
        return __awaiter(this, void 0, void 0, function* () {
            const publicKey = javascript_sdk_1.crypto.generatePubKey(Buffer.from(skHex, 'hex'));
            const publicKeyHex = publicKey.encode('hex');
            return Object.assign(Object.assign({}, ChainUtils_1.ChainUtils.sign(data, skHex, true)), { publicKeyHex });
        });
    }
    processPaymentFromPrivateKey(sk, targetAddress, currency, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const addressFrom = javascript_sdk_1.crypto.getAddressFromPrivateKey(sk, this.networkStage === 'test' ? 'tbnb' : 'bnb');
            const tx = yield this.createPaymentTransaction(addressFrom, targetAddress, currency, amount);
            const signedTx = yield this.signTransaction(sk, tx);
            return yield this.broadcastTransaction(signedTx);
        });
    }
    _processPaymentFromPrivateKey(sk, targetAddress, currency, amount) {
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
            const sequenceURL = `${this.url}/api/v1/account/${addressFrom}`;
            let [sequence, accountNumber] = yield this.getSequence(sequenceURL);
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
            return apiRes.tx.map((tx) => this.parseTx(tx)).filter(Boolean);
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
            const res = yield this.api(sequenceURL);
            return [res.sequence || '0', res.account_number || '0'];
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
            const confTime = Date.parse(timestamp);
            const decoded = txsEncoded.map((txe) => BinanceTxParser_1.BinanceTxParser.parseFromHex(this.network(), this.feeCurrency(), Buffer.from(txe['tx'], 'base64').toString('hex'), confTime, txe['hash']))
                .filter(Boolean)
                .map(this.addFeeToRawParsedTx);
            return {
                transactions: decoded,
                transactionIds: decoded.map((t) => t.id),
                timestamp: confTime,
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
            const transactions = txs.map((tx) => this.parseTx(tx)).filter(Boolean);
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
        tx.fee = GasPriceProvider_1.BINANCE_FEE; // TODO: Fix the raw parser to include the fee
        tx.feeCurrency = this.feeCurrency();
        tx.feeDecimals = ChainUtils_1.BINANCE_DECIMALS;
        return tx;
    }
    parseTx(tx) {
        return tx.txType === 'TRANSFER' ? {
            id: tx.txHash,
            network: this.network(),
            confirmationTime: new Date(tx.timeStamp).getTime(),
            fromItems: [{
                    address: tx.fromAddr,
                    currency: `${this.network()}:${tx.txAsset}`,
                    amount: tx.value,
                    decimals: ChainUtils_1.BINANCE_DECIMALS,
                }],
            toItems: [{
                    address: tx.toAddr,
                    currency: `${this.network()}:${tx.txAsset}`,
                    amount: tx.value,
                    decimals: ChainUtils_1.BINANCE_DECIMALS,
                }],
            fee: tx.txFee,
            feeCurrency: this.feeCurrency(),
            feeDecimals: ChainUtils_1.BINANCE_DECIMALS,
            singleItem: true,
            confirmed: true,
        } : undefined;
    }
    getBnbClient() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.bnbClient) {
                const binanceNetwork = this.networkStage === 'test' ? 'testnet' : 'mainnet';
                console.log('Initializing the binance chain', binanceNetwork, this.url);
                this.bnbClient = new javascript_sdk_1.default(this.url);
                this.bnbClient.chooseNetwork(binanceNetwork);
                yield this.bnbClient.initChain();
                // await sleep(3000);
                console.log('Chain initialized', binanceNetwork);
            }
            return this.bnbClient;
        });
    }
    serializeTx(options, signMsg) {
        return Object.assign(Object.assign({}, options), { msg: signMsg });
    }
    deserializeTx(tx) {
        return Object.assign(Object.assign({}, tx), { msg: this.getMsgFromSignMsg(tx['msg']) });
    }
    getMsgFromSignMsg(signMsg) {
        const accCode = javascript_sdk_1.crypto.decodeAddress(signMsg.inputs[0].address);
        const toAccCode = javascript_sdk_1.crypto.decodeAddress(signMsg.outputs[0].address);
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
    fullCurrency(tok) {
        return `${this.network()}:${tok}`;
    }
}
exports.BinanceChainClient = BinanceChainClient;
//# sourceMappingURL=BinanceChainClient.js.map