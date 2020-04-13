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
const ChainUtils_1 = require("../ChainUtils");
const bn_js_1 = __importDefault(require("bn.js"));
const GasPriceProvider_1 = require("../GasPriceProvider");
const bitcore = __importStar(require("bitcore-lib"));
const cross_fetch_1 = __importDefault(require("cross-fetch"));
// @ts-ignore
const sighash_1 = require("bitcore-lib/lib/transaction/sighash");
// @ts-ignore
const signature_1 = __importDefault(require("bitcore-lib/lib/transaction/signature"));
const ferrum_crypto_1 = require("ferrum-crypto");
const bitcore_lib_1 = require("bitcore-lib");
const BTC_DECIMALS = 8;
const BITCOIN_TX_FETCH_TIMEOUT = 1000 * 3600;
function fromSatoshi(satoshi) {
    return ChainUtils_1.ChainUtils.toDecimalStr(satoshi, 8);
}
function toSatoshi(btc) {
    return ChainUtils_1.ChainUtils.toBigIntStr(btc, 8);
}
function invertHas(buf) {
    return new bn_js_1.default(buf).toArrayLike(Buffer, 'le', 32);
}
function toBitcoreTransaction(x) {
    const bitcoreUtxos = x.utxos.map(u => ({
        txid: u.txid,
        outputIndex: u.vout,
        satoshis: Number(u.value),
        address: x.from,
        script: bitcore.Script.fromAddress(x.from),
    }));
    const toItems = [
        { address: x.to, satoshis: Number(toSatoshi(x.amount)) },
    ];
    if (Number(x.change) > 0) {
        toItems.push({ address: x.from, satoshis: Number(toSatoshi(x.change)) });
    }
    return new bitcore.Transaction()
        .from(bitcoreUtxos)
        .to(toItems, Number(toSatoshi(x.amount)))
        // .change(x.from)
        .fee(Number(toSatoshi(x.fee)));
}
function parseTrezorTx(network, tx) {
    ferrum_plumbing_1.ValidationUtils.isTrue(!!tx, '"tx" is required');
    const fromItems = (tx.vin || []).map((i) => ({
        address: (i.addresses && i.addresses.length === 1) ? i.addresses[0] : '',
        currency: `${network}:BTC`,
        decimals: BTC_DECIMALS,
        amount: fromSatoshi(i.value),
    }));
    const toItems = (tx.vout || []).map((i) => ({
        amount: fromSatoshi(i.value),
        decimals: BTC_DECIMALS,
        currency: `${network}:BTC`,
        address: ((i.scriptPubKey || {}).addresses || [''])[0] || '',
    }));
    return {
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
    };
}
class BitcoinClient {
    constructor(networkStage, cache, addressGen) {
        this.networkStage = networkStage;
        this.cache = cache;
        this.addressGen = addressGen;
        this.network = this.networkStage === 'test' ? 'BITCOIN_TESTNET' : 'BITCOIN';
        this.baseUrl = this.networkStage === 'test' ? 'https://tbtc2.trezor.io/api/v2/' : 'https://btc2.trezor.io/api/v2/';
    }
    __name__() { return 'BitcoinClient'; }
    broadcastTransaction(transaction) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.get(`sendtx/${transaction.serializedTransaction}`);
            ferrum_plumbing_1.ValidationUtils.isTrue(!!res && res.result, 'Error sending transaction: No transaction ID was generated');
            return res.result;
        });
    }
    createPaymentTransaction(fromAddress, targetAddress, currency, amount, gasOverride, memo, nonce) {
        return __awaiter(this, void 0, void 0, function* () {
            ferrum_plumbing_1.ValidationUtils.isTrue(!!fromAddress, '"fromAddress" must be provided');
            ferrum_plumbing_1.ValidationUtils.isTrue(!!targetAddress, '"targetAddress" must be provided');
            ferrum_plumbing_1.ValidationUtils.isTrue(ChainUtils_1.ChainUtils.tokenPart(currency) === 'BTC', 'Invalid currency ' + currency);
            // ValidationUtils.isTrue(!!gasOverride, '"gasOverride" is required');
            const allUtxos = ((yield this.getUtxos(fromAddress)) || []).filter(u => u.confirmations > 0 && Number(u.value) > 0);
            const bal = allUtxos.map(u => new bn_js_1.default(u.value)).reduce((p, c) => p.add(c), new bn_js_1.default(0)) || new bn_js_1.default(0);
            const fee = yield this.calcFee(gasOverride);
            const satoshis = new bn_js_1.default(toSatoshi(amount));
            const balRequired = fee.add(satoshis);
            ferrum_plumbing_1.ValidationUtils.isTrue(bal.gte(balRequired), `Not enough balance (expected ${balRequired.toString()} but had ${bal.toString()})`);
            const [utxos, change] = BitcoinClient.calcSendUtxos(allUtxos, satoshis, fee);
            const tx = {
                utxos: utxos,
                amount: amount.toString(),
                fee: fromSatoshi(fee.toString()),
                from: fromAddress,
                to: targetAddress,
                change: fromSatoshi(change.toString()),
            };
            const bitcoreTx = toBitcoreTransaction(tx);
            const signables = bitcoreTx.inputs.map((i, idx) => ferrum_crypto_1.arrayBufferToHex(invertHas(sighash_1.sighash(bitcoreTx, 0x01, idx, i.output.script))));
            // @ts-ignore
            return { transaction: tx, serializedTransaction: bitcoreTx.serialize({ disableIsFullySigned: true, disableDustOutputs: true }),
                signableHex: signables.join(','),
            };
        });
    }
    feeCurrency() {
        return this.networkStage === 'test' ? 'BITCOIN_TESTNET:BTC' : 'BITCOIN:BTC';
    }
    feeDecimals() {
        return 8;
    }
    getBalance(address, currency) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.get(`address/${address}?details=basic`);
            if (!res || !res.balance) {
                ferrum_plumbing_1.ValidationUtils.isTrue(res && res.balance, '"Error getting balance for address ' + address + ':' + (res || '').toString());
            }
            return res.balance;
        });
    }
    getBlockByNumber(number) {
        return __awaiter(this, void 0, void 0, function* () {
            const [block, totalPages] = yield this.getSinglePageBlockByNumber(number, 1);
            for (let p = 2; p <= totalPages; p++) {
                const [moreBlock, _] = yield this.getSinglePageBlockByNumber(number, p);
                moreBlock.transactionIds.forEach(tid => block.transactionIds.push(tid));
                moreBlock.transactions.forEach(t => block.transactions.push(t));
            }
            return block;
        });
    }
    getSinglePageBlockByNumber(number, page) {
        return __awaiter(this, void 0, void 0, function* () {
            let blockData = yield this.get(`block/${number}?page=${page}`);
            ferrum_plumbing_1.ValidationUtils.isTrue(blockData && blockData.hash, `Error calling api for block ${number}, no hash in the result`);
            const txs = (blockData.txs || []).map((t) => parseTrezorTx(this.network, t));
            const totalPages = blockData.totalPages;
            const block = {
                hash: blockData.hash,
                number: blockData.height,
                timestamp: blockData.time * 1000,
                transactionIds: txs.map((t) => t.id),
                transactions: txs,
            };
            return [block, totalPages];
        });
    }
    getBlockNumber() {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.get('/status');
            const bNo = ((res || {}).backend || {}).blocks;
            if (!bNo) {
                ferrum_plumbing_1.ValidationUtils.isTrue(!!bNo, 'Error getting blocks. Bad result' + res.toString());
            }
            return bNo;
        });
    }
    getRecentTransactionsByAddress(address, currencies) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.get(`address/${address}?details=txslight`);
            if (!res || !res.balance) {
                ferrum_plumbing_1.ValidationUtils.isTrue(res && res.balance, '"Error getting balance for address ' + address + ':' + (res || '').toString());
            }
            if (res && res.txs) {
                return res.txs.map((t) => parseTrezorTx(this.network, t));
            }
            return [];
        });
    }
    getTransactionById(tid) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.get(`tx/${tid}`);
            if (!tx || !tx.txid) {
                ferrum_plumbing_1.ValidationUtils.isTrue(false, `Error getting transaction ${tid}. Received: ${(tx || '').toString()}`);
            }
            return parseTrezorTx(this.network, tx);
        });
    }
    processPaymentFromPrivateKey(skHex, targetAddress, currency, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.processPaymentFromPrivateKeyWithGas(skHex, targetAddress, currency, amount, yield this.getGasEstimate());
        });
    }
    processPaymentFromPrivateKeyWithGas(skHex, targetAddress, currency, amount, gasOverride) {
        return __awaiter(this, void 0, void 0, function* () {
            const addr = yield this.addressGen.addressFromSk(skHex);
            const tx = yield this.createPaymentTransaction(addr.address, targetAddress, currency, amount, gasOverride);
            const signed = yield this.signTransaction(skHex, tx);
            return this.broadcastTransaction(signed);
        });
    }
    sign(skHex, data, forceLow) {
        return __awaiter(this, void 0, void 0, function* () {
            return ChainUtils_1.ChainUtils.sign(data, skHex, true);
        });
    }
    signTransaction(skHex, transaction) {
        return __awaiter(this, void 0, void 0, function* () {
            ferrum_plumbing_1.ValidationUtils.isTrue(!!transaction && !!transaction.transaction, 'Transaction must be provided');
            const tx = toBitcoreTransaction(transaction.transaction);
            const sigHex = [];
            if (transaction.signature && Array.isArray(transaction.signature)) {
                // transaction is already signed. Just apply the signature
                transaction.signature.forEach(s => sigHex.push(s));
            }
            else if (transaction.signature) {
                sigHex.push(transaction.signature);
            }
            else {
                ferrum_plumbing_1.ValidationUtils.isTrue(!!transaction.signableHex, 'transaction has no signable hex');
                const sinables = (transaction.signableHex || '').split(',');
                for (const signable of sinables) {
                    sigHex.push(yield this.sign(skHex, signable, true));
                }
            }
            ferrum_plumbing_1.ValidationUtils.isTrue(sigHex.length === tx.inputs.length, `Wrong number of signatures.
    Expected ${tx.inputs.length}, but got ${sigHex.length}`);
            const sk = new bitcore_lib_1.PrivateKey(skHex, this.networkStage === 'test' ? bitcore.Networks.testnet : bitcore.Networks.mainnet);
            sigHex.forEach((sig, idx) => {
                // @ts-ignore
                const signature = bitcore.crypto.Signature.fromCompact(Buffer.from(ChainUtils_1.ChainUtils.signatureToHex(sig), 'hex'));
                // @ts-ignore
                signature.inputIndex = idx;
                const siggg = new signature_1.default({
                    publicKey: sk.publicKey,
                    prevTxId: tx.inputs[idx].prevTxId,
                    outputIndex: tx.inputs[idx].outputIndex,
                    inputIndex: idx,
                    signature: signature,
                    sigtype: 0x01,
                });
                tx.applySignature(siggg);
            });
            // @ts-ignore
            return Object.assign(Object.assign({}, transaction), { serializedTransaction: tx.serialize({ disableDustOutputs: true }) });
        });
    }
    waitForTransaction(transactionId) {
        return ChainUtils_1.waitForTx(this, transactionId, BITCOIN_TX_FETCH_TIMEOUT, ChainUtils_1.ChainUtils.TX_FETCH_TIMEOUT * 10);
    }
    getUtxos(address) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.get(`utxo/${address}`);
            ferrum_plumbing_1.ValidationUtils.isTrue(!!res && res.length !== undefined, 'Invalid resuts for UTXO: ' + res.toString());
            return res;
        });
    }
    get(api) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield cross_fetch_1.default(`${this.baseUrl}${api}`);
            if (res.status >= 400) {
                const text = yield res.text();
                if (res.status === 404) { // Not found
                    return undefined;
                }
                throw new Error(`Error getting api ${api}: ${res.statusText} - ${text}`);
            }
            const j = yield res.json();
            if (j.error) {
                throw new Error('Error callin api ' + api + ':' + j.error);
            }
            return j;
        });
    }
    static calcSendUtxos(utxos = [], amount, fee) {
        const usedUtxos = [];
        let sum = new bn_js_1.default(0);
        const total = amount.add(fee);
        for (let i = 0; i < utxos.length; i++) {
            const u = utxos[i];
            usedUtxos.push(u);
            sum.iadd(new bn_js_1.default(u.value));
            if (sum.gte(total)) {
                return [usedUtxos, sum.sub(total)];
            }
        }
        throw new Error(`Not enough balance to calcSendUtxos. Available: ${sum.toString()} needed ${total.toString()}`);
    }
    getGasEstimate() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.cache.getAsync('BITCOIN_GAS_PRICE', () => __awaiter(this, void 0, void 0, function* () {
                const res = yield this.get('estimatefee/12');
                ferrum_plumbing_1.ValidationUtils.isTrue(res && res.result, "Error estimating fee, no result from api");
                return res.result;
            }), GasPriceProvider_1.EthereumGasPriceProvider.GasTimeout * 4);
        });
    }
    calcFee(gasOverwrite) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!!gasOverwrite) {
                if (typeof gasOverwrite === 'string') {
                    return new bn_js_1.default(toSatoshi(gasOverwrite));
                }
                return BitcoinClient.calFeeFromGas(gasOverwrite);
            }
            // const gasLimit = (180 * utxosCnt + 2 * 34 + 10 + 40).toString();
            return new bn_js_1.default(toSatoshi(yield this.getGasEstimate()));
        });
    }
    static calFeeFromGas(gas) {
        ferrum_plumbing_1.ValidationUtils.isTrue(!!gas.gasPrice, '"gasOverwrite.gasPrice" must be provided');
        ferrum_plumbing_1.ValidationUtils.isTrue(!!gas.gasLimit, '"gasOverwrite.gasLimit" must be provided');
        return new bn_js_1.default(toSatoshi(gas.gasPrice)).muln(Number(gas.gasLimit || '1'));
    }
}
exports.BitcoinClient = BitcoinClient;
//# sourceMappingURL=BitcoinClient.js.map