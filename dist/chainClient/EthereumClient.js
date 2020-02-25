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
const bn_js_1 = __importDefault(require("bn.js"));
const web3_1 = __importDefault(require("web3"));
const types_1 = require("./types");
// @ts-ignore
const abi_decoder_1 = __importDefault(require("abi-decoder"));
const abi = __importStar(require("../resources/erc20-abi.json"));
const ferrum_plumbing_1 = require("ferrum-plumbing");
const ChainUtils_1 = require("./ChainUtils");
const GasPriceProvider_1 = require("./GasPriceProvider");
const ethereumjs_tx_1 = require("ethereumjs-tx");
const ferrum_crypto_1 = require("ferrum-crypto");
const ethereumjs_util_1 = require("ethereumjs-util");
const BLOCK_CACH_TIMEOUT = 10 * 1000;
function toDecimal(amount, decimals) {
    return ChainUtils_1.ChainUtils.toDecimalStr(amount, decimals);
}
function toWei(decimals, amount) {
    return new bn_js_1.default(ChainUtils_1.ChainUtils.toBigIntStr(amount, decimals));
}
class EthereumClient {
    constructor(networkStage, config, gasService) {
        this.networkStage = networkStage;
        this.gasService = gasService;
        this.lastBlockNumber = 0;
        this.lastBlockRead = 0;
        this.provider = networkStage === 'test' ? config.web3ProviderRinkeby : config.web3Provider;
        this.requiredConfirmations = config.requiredEthConfirmations !== undefined ? config.requiredEthConfirmations : 1;
        this.txWaitTimeout = config.pendingTransactionShowTimeout
            || ChainUtils_1.ChainUtils.DEFAULT_PENDING_TRANSACTION_SHOW_TIMEOUT * 10;
        abi_decoder_1.default.addABI(abi.abi);
    }
    network() { return this.networkStage === 'prod' ? 'ETHEREUM' : 'RINKEBY'; }
    ;
    feeCurrency() { return this.networkStage === 'prod' ? 'ETHEREUM:ETH' : 'RINKEBY:ETH'; }
    feeDecimals() { return ChainUtils_1.ETH_DECIMALS; }
    getBlockByNumber(number) {
        return __awaiter(this, void 0, void 0, function* () {
            const block = yield this.web3().eth.getBlock(number);
            const rv = {
                hash: block.hash,
                number: block.number,
                timestamp: block.timestamp,
                transactionIds: [],
                transactions: [],
            };
            const transactions = block.transactions;
            // for(let tid of transactions) {
            //     const v = await this.getTransactionById(tid);
            //     if (v) {
            //         v.confirmationTime = block.timestamp * 1000;
            //         rv.transactionIds.push(v.id);
            //         rv.transactions!.push(v);
            //     }
            // }
            const transactionsF = transactions.map((tid) => this.getTransactionById(tid));
            const allTransactions = yield Promise.all(transactionsF);
            allTransactions.forEach((v) => {
                if (!!v) {
                    v.confirmationTime = block.timestamp * 1000;
                    rv.transactionIds.push(v.id);
                    rv.transactions.push(v);
                }
            });
            return rv;
        });
    }
    getBlockNumber() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.web3().eth.getBlockNumber();
        });
    }
    getCachedCurrentBlock() {
        return __awaiter(this, void 0, void 0, function* () {
            if ((Date.now() - this.lastBlockRead) < BLOCK_CACH_TIMEOUT) {
                return this.lastBlockNumber;
            }
            return this.getBlockNumber();
        });
    }
    getTransactionById(tid) {
        return __awaiter(this, void 0, void 0, function* () {
            return ferrum_plumbing_1.retry(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    const web3 = new web3_1.default(new web3_1.default.providers.HttpProvider(this.provider));
                    const transaction = yield web3.eth.getTransaction(tid);
                    if (!transaction) {
                        return undefined;
                    }
                    let transactionReceipt = yield web3.eth.getTransactionReceipt(tid);
                    if (!transactionReceipt) {
                        return undefined;
                    }
                    const currentBlock = yield this.getCachedCurrentBlock();
                    let confirmed = transactionReceipt.blockNumber === null ? 0 : Math.max(1, currentBlock - transactionReceipt.blockNumber);
                    let is_confirmed = confirmed >= this.requiredConfirmations;
                    if (!transactionReceipt) {
                        const msg = 'EthereumClient.getTransactionById: Transaction did not have any receipt / logs: ' + tid;
                        console.error(msg);
                        throw new ferrum_plumbing_1.RetryableError(msg);
                    }
                    const fee = web3_1.default.utils.fromWei(new bn_js_1.default(transaction.gasPrice).muln(transactionReceipt.gasUsed), 'ether');
                    if (!transactionReceipt.status) {
                        // Transaction failed.
                        const reason = yield EthereumClient.getTransactionError(web3, transaction);
                        return {
                            network: this.network(),
                            fee: fee,
                            feeCurrency: this.feeCurrency(),
                            feeDecimals: ChainUtils_1.ETH_DECIMALS,
                            fromItems: [{
                                    address: transaction.from,
                                    currency: '',
                                    amount: '0'
                                }],
                            toItems: [{
                                    address: transaction.to,
                                    currency: '',
                                    amount: '0'
                                }],
                            confirmed: false,
                            confirmationTime: 0,
                            failed: true,
                            id: transactionReceipt['transactionHash'],
                            singleItem: true,
                            reason,
                        };
                    }
                    let logs = transactionReceipt['logs'];
                    if (logs !== undefined) {
                        let decodedLogs = [];
                        try {
                            decodedLogs = abi_decoder_1.default.decodeLogs(logs)
                                .filter((log) => log && log.name === "Transfer");
                        }
                        catch (e) {
                            console.warn('Error decoding logs for transaction ', tid, e);
                        }
                        const len = decodedLogs.length;
                        if (len > 0) { // ERC-20 transaction
                            return this.processErc20Transaction(fee, is_confirmed, transactionReceipt, decodedLogs);
                        }
                        else { // normal eth to eth transaction.
                            if (transaction.input && transaction.input.length > 3) {
                                // TODO: Potentially internal transaction
                            }
                            const cur = this.feeCurrency();
                            return {
                                network: this.network(),
                                fee: fee,
                                feeCurrency: cur,
                                fromItems: [{
                                        address: transactionReceipt["from"],
                                        currency: cur,
                                        amount: web3.utils.fromWei(new bn_js_1.default(transaction['value']), "ether"),
                                        decimals: ChainUtils_1.ETH_DECIMALS,
                                    }],
                                toItems: [{
                                        address: transactionReceipt["to"],
                                        currency: cur,
                                        amount: web3.utils.fromWei(new bn_js_1.default(transaction['value']), "ether"),
                                        decimals: ChainUtils_1.ETH_DECIMALS,
                                    }],
                                confirmed: is_confirmed,
                                confirmationTime: 0,
                                failed: false,
                                id: transactionReceipt['transactionHash'],
                                singleItem: true,
                            };
                        }
                    }
                    return undefined;
                }
                catch (e) {
                    console.warn('Error processing transaction ', tid, e);
                    if (e.toString().indexOf('JSON RPC') >= 0) {
                        throw new ferrum_plumbing_1.RetryableError(e.message);
                    }
                }
            }));
        });
    }
    processPaymentFromPrivateKey(skHex, targetAddress, currency, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.processPaymentFromPrivateKeyWithGas(skHex, targetAddress, currency, amount, '0');
        });
    }
    processPaymentFromPrivateKeyWithGas(skHex, targetAddress, currency, amount, gasOverride) {
        return __awaiter(this, void 0, void 0, function* () {
            let tx = undefined;
            const web3 = this.web3();
            const privateKeyHex = '0x' + skHex;
            const addressFrom = web3.eth.accounts.privateKeyToAccount(privateKeyHex);
            if (currency === this.feeCurrency()) {
                tx = yield this.createSendEth(addressFrom.address, targetAddress, amount, gasOverride);
            }
            else {
                tx = yield this.createErc20SendTransaction(currency, addressFrom.address, targetAddress, amount, (bal) => this.getGas(true, currency, bal, gasOverride));
            }
            const signed = yield this.signTransaction(skHex, tx);
            return this.broadcastTransaction(signed);
        });
    }
    static getGasLimit(erc20, currency, targetBalance) {
        return __awaiter(this, void 0, void 0, function* () {
            if (erc20) {
                return GasPriceProvider_1.EthereumGasPriceProvider.gasLimiForErc20(currency, targetBalance || '0');
            }
            else {
                return GasPriceProvider_1.EthereumGasPriceProvider.ETH_TX_GAS;
            }
        });
    }
    getGas(erc20, currency, targetBalance, gasOverride) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!!gasOverride && typeof gasOverride === 'object') {
                const go = gasOverride;
                const gasLimit = go.gasLimit && Number.isFinite(Number(go.gasLimit)) ?
                    Number(go.gasLimit) : yield EthereumClient.getGasLimit(erc20, currency, targetBalance);
                return [go.gasPrice, gasLimit];
            }
            const gasLimit = yield EthereumClient.getGasLimit(erc20, currency, targetBalance);
            if (erc20) {
                const gasOverrideBN = new bn_js_1.default(web3_1.default.utils.toWei(gasOverride || '0', 'ether'));
                let gasPriceBN = gasOverrideBN.divn(gasLimit);
                if (gasPriceBN.muln(gasLimit).gt(gasOverrideBN)) {
                    ferrum_plumbing_1.ValidationUtils.isTrue(false, `Error calculating gas price from override (${gasOverride}.` +
                        ` Limit was ${gasLimit} but the calculated price ${gasPriceBN.toString()} generates a higher gas than overriden limit`);
                }
                if (!gasOverride) {
                    return [(yield this.gasService.getGasPrice()).medium, gasLimit];
                }
                return [gasPriceBN.toString(), gasLimit];
            }
            if (!gasOverride) {
                return [(yield this.gasService.getGasPrice()).medium, gasLimit];
            }
            let gasPriceBN = new bn_js_1.default(ChainUtils_1.ChainUtils.toBigIntStr(gasOverride, ChainUtils_1.ETH_DECIMALS) || '0').divn(gasLimit);
            return [gasPriceBN.toString(), gasLimit];
        });
    }
    createSendEth(from, to, amount, gasOverride, nonce) {
        return __awaiter(this, void 0, void 0, function* () {
            const web3 = this.web3();
            let sendAmount = toWei(ChainUtils_1.ETH_DECIMALS, amount);
            const [gasPrice, gasLimit] = yield this.getGas(false, this.feeCurrency(), '0', gasOverride);
            const params = {
                nonce: nonce || (yield web3.eth.getTransactionCount(from, 'pending')),
                gasPrice: '0x' + new bn_js_1.default(gasPrice).toString('hex'),
                gasLimit: '0x' + new bn_js_1.default(gasLimit).toString('hex'),
                to: to,
                value: '0x' + sendAmount.toString('hex'),
                data: '0x',
            };
            const tx = new ethereumjs_tx_1.Transaction(params, this.getChainOptions());
            const serialized = tx.serialize().toString('hex');
            // ValidationUtils.isTrue(tx.validate(), 'Ivalid transaction generated');
            return {
                serializedTransaction: serialized,
                signableHex: tx.hash(false).toString('hex'),
                transaction: params,
            };
        });
    }
    signTransaction(skHex, transaction) {
        return __awaiter(this, void 0, void 0, function* () {
            let sigHex = undefined;
            if (transaction.signature && transaction.signature.r) {
                // transaction is already signed. Just apply the signature
                sigHex = transaction.signature;
            }
            else {
                ferrum_plumbing_1.ValidationUtils.isTrue(!!transaction.signableHex, 'transaction has no signable hex');
                sigHex = yield this.sign(skHex, transaction.signableHex);
            }
            const tx = new ethereumjs_tx_1.Transaction('0x' + transaction.serializedTransaction, this.getChainOptions());
            // if (tx._implementsEIP155()) {
            //     sig.v += this.getChainId() * 2 + 8;
            // }
            Object.assign(tx, this.decodeSignature(sigHex));
            return Object.assign(Object.assign({}, transaction), { serializedTransaction: tx.serialize().toString('hex') });
        });
    }
    decodeSignature(sig) {
        return {
            r: Buffer.from(sig.r, 'hex'),
            s: Buffer.from(sig.s, 'hex'),
            v: sig.v,
        };
    }
    sign(skHex, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const sig = ethereumjs_util_1.ecsign(Buffer.from(data, 'hex'), Buffer.from(skHex, 'hex'));
            sig.v += this.getChainId() * 2 + 8;
            return { r: sig.r.toString('hex'), s: sig.s.toString('hex'), v: sig.v };
        });
    }
    broadcastTransaction(transaction) {
        return __awaiter(this, void 0, void 0, function* () {
            const web3 = this.web3();
            const tx = new ethereumjs_tx_1.Transaction('0x' + transaction.serializedTransaction, this.getChainOptions());
            ferrum_plumbing_1.ValidationUtils.isTrue(tx.validate(), 'Provided transaction is invalid');
            ferrum_plumbing_1.ValidationUtils.isTrue(tx.verifySignature(), 'Signature cannot be verified');
            const rawTransaction = '0x' + transaction.serializedTransaction;
            // var transactionHash = utils.keccak256(rawTransaction);
            const sendRawTx = (rawTx) => new Promise((resolve, reject) => web3.eth
                .sendSignedTransaction(rawTx)
                .on('transactionHash', resolve)
                .on('error', reject));
            return yield sendRawTx(rawTransaction);
        });
    }
    createPaymentTransaction(fromAddress, targetAddress, currency, amount, gasOverride, memo, nonce) {
        return __awaiter(this, void 0, void 0, function* () {
            if (currency === this.feeCurrency()) {
                return this.createSendEth(fromAddress, targetAddress, amount, gasOverride);
            }
            return this.createErc20SendTransaction(currency, fromAddress, targetAddress, amount, bal => this.getGas(true, currency, bal, gasOverride));
        });
    }
    /**
     * Note: This only returns incoming transactions to the given address and only works for ERC20 transactions
     */
    getRecentTransactionsByAddress(address, currencies) {
        return __awaiter(this, void 0, void 0, function* () {
            const web3 = this.web3();
            const res = [];
            const tokens = currencies.map(ChainUtils_1.ChainUtils.tokenPart);
            const _decimals = {};
            for (const tok of tokens) {
                _decimals[tok] = yield this.getTokenDecimals(tok);
            }
            for (let tok of tokens) {
                let erc20Contract = new web3.eth.Contract(abi.abi, tok);
                const pastEvents = yield erc20Contract.getPastEvents('Transfer', {
                    fromBlock: 0,
                    toBlock: 'latest',
                    filter: { to: address }
                });
                pastEvents.forEach((event) => {
                    const decimals = _decimals[tok];
                    const amount = toDecimal(event.returnValues.value, decimals);
                    res.push({
                        network: this.network(),
                        fee: '0',
                        feeCurrency: this.feeCurrency(),
                        fromItems: [{
                                address: event.returnValues.from,
                                currency: tok,
                                amount: amount,
                                decimals
                            }],
                        toItems: [{
                                address: event.returnValues.to,
                                currency: tok,
                                amount: amount,
                                decimals
                            }],
                        confirmed: true,
                        confirmationTime: 0,
                        creationTime: 0,
                        failed: false,
                        id: event['transactionHash'],
                        singleItem: true,
                    });
                });
            }
            return res;
        });
    }
    getBalance(address, currency) {
        return __awaiter(this, void 0, void 0, function* () {
            const web3 = this.web3();
            if (currency === types_1.NetworkNativeCurrencies.ETHEREUM) {
                const bal = yield web3.eth.getBalance(address);
                return web3.utils.fromWei(bal, 'ether');
            }
            else {
                const token = ChainUtils_1.ChainUtils.tokenPart(currency);
                const decimals = yield this.getTokenDecimals(token);
                return this.getBalanceForContract(web3, address, token, decimals);
            }
        });
    }
    getBalanceForContract(web3, address, contractAddress, decimals) {
        return __awaiter(this, void 0, void 0, function* () {
            let erc20Contract = new web3.eth.Contract(abi.abi, contractAddress);
            const bal = yield erc20Contract.methods.balanceOf(address).call();
            const bn = web3.utils.toBN(bal);
            return toDecimal(bn, decimals);
        });
    }
    waitForTransaction(transactionId) {
        return __awaiter(this, void 0, void 0, function* () {
            return ChainUtils_1.waitForTx(this, transactionId, this.txWaitTimeout, ChainUtils_1.ChainUtils.TX_FETCH_TIMEOUT * 10);
        });
    }
    web3() {
        // console.log('Using http provider', this.provider);
        return new web3_1.default(new web3_1.default.providers.HttpProvider(this.provider));
    }
    getChainId() {
        return this.networkStage === 'test' ? 4 : 1;
    }
    getChainOptions() {
        return { chain: this.networkStage === 'test' ? 'rinkeby' : 'mainnet', hardfork: 'petersburg' };
    }
    static getTransactionError(web3, transaction) {
        return __awaiter(this, void 0, void 0, function* () {
            const code = yield web3.eth.call(transaction);
            return ferrum_crypto_1.hexToUtf8(code.substr(138)).replace(/\0/g, '');
        });
    }
    createErc20SendTransaction(currency, from, to, amount, gasProvider, nonce) {
        return __awaiter(this, void 0, void 0, function* () {
            const web3 = this.web3();
            const contractAddress = ChainUtils_1.ChainUtils.tokenPart(currency);
            const consumerContract = new web3.eth.Contract(abi.abi, contractAddress);
            const decimals = yield this.getTokenDecimals(contractAddress);
            let sendAmount = new bn_js_1.default(ChainUtils_1.ChainUtils.toBigIntStr(amount, decimals));
            const myData = consumerContract.methods.transfer(to, '0x' + sendAmount.toString('hex')).encodeABI();
            const targetBalance = yield this.getBalanceForContract(web3, to, contractAddress, 1);
            const [gasPrice, gasLimit] = yield gasProvider(targetBalance);
            const params = {
                nonce: nonce || (yield web3.eth.getTransactionCount(from, 'pending')),
                gasPrice: '0x' + new bn_js_1.default(gasPrice).toString('hex'),
                gasLimit: '0x' + new bn_js_1.default(gasLimit).toString('hex'),
                to: contractAddress,
                value: 0,
                data: myData,
            };
            const tx = new ethereumjs_tx_1.Transaction(params, this.getChainOptions());
            const serialized = tx.serialize().toString('hex');
            return {
                serializedTransaction: serialized,
                signableHex: tx.hash(false).toString('hex'),
                transaction: params,
            };
        });
    }
    processErc20Transaction(fee, confirmed, transactionReceipt, logs) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = {
                network: this.network(),
                fee,
                feeCurrency: this.feeCurrency(),
                feeDecimals: ChainUtils_1.ETH_DECIMALS,
                fromItems: [],
                toItems: [],
                confirmed,
                confirmationTime: 0,
                failed: false,
                id: transactionReceipt['transactionHash']
            };
            const _decimals = {};
            const toks = new Set();
            logs.forEach((decodedLog) => {
                if (decodedLog.name === 'Transfer') {
                    toks.add(decodedLog.address);
                }
            });
            for (const tok of toks) {
                _decimals[tok] = yield this.getTokenDecimals(tok);
            }
            logs.forEach((decodedLog) => {
                if (decodedLog.name === 'Transfer') {
                    const tok = decodedLog.address;
                    const decimals = _decimals[tok];
                    const from = {
                        address: decodedLog.events[0].value,
                        currency: this.currencyForErc20(tok),
                        amount: toDecimal(decodedLog.events[2].value, decimals),
                        decimals,
                    };
                    const to = {
                        address: decodedLog.events[1].value,
                        currency: this.currencyForErc20(tok),
                        amount: toDecimal(decodedLog.events[2].value, decimals),
                        decimals,
                    };
                    tx.fromItems.push(from);
                    tx.toItems.push(to);
                }
            });
            return tx;
        });
    }
    currencyForErc20(tok) {
        return `${this.network()}:${ChainUtils_1.ChainUtils.canonicalAddress(this.network(), tok)}`;
    }
}
exports.EthereumClient = EthereumClient;
//# sourceMappingURL=EthereumClient.js.map