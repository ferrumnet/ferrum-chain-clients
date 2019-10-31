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
const ETH_DECIMALS = 18;
const DecimalToUnit = {
    '1': 'wei',
    '3': 'kwei',
    '6': 'mwei',
    '9': 'gwei',
    '12': 'szabo',
    '15': 'finney',
    '18': 'ether',
};
class EthereumClient {
    constructor(networkStage, config, gasService) {
        this.networkStage = networkStage;
        this.gasService = gasService;
        this.provider = config.web3Provider;
        this.contractAddresses = config.contractAddresses;
        this.decimals = config.contractDecimals;
        this.requiredConfirmations = config.requiredEthConfirmations || 1;
        this.txWaitTimeout = config.pendingTransactionShowTimeout
            || ChainUtils_1.ChainUtils.DEFAULT_PENDING_TRANSACTION_SHOW_TIMEOUT * 10;
        abi_decoder_1.default.addABI(abi.abi);
    }
    feeCurrency() {
        return 'ETH';
    }
    findContractInfo(contractAddress) {
        const coins = Object.keys(this.contractAddresses);
        const selectedCoin = coins
            .find(c => this.contractAddresses[c].toLowerCase() === contractAddress.toLowerCase());
        if (selectedCoin) {
            return {
                name: selectedCoin,
                address: this.contractAddresses[selectedCoin],
                decimal: this.decimals[selectedCoin] || 1,
            };
        }
        return { name: contractAddress.toLowerCase(), address: contractAddress, decimal: 1 };
    }
    getBlockByNumber(number) {
        return __awaiter(this, void 0, void 0, function* () {
            const block = yield this.web3().eth.getBlock(number, false);
            const transactions = block.transactions;
            const transactionsF = transactions.map((tid) => this.getTransactionById(tid));
            const allTransactions = yield Promise.all(transactionsF);
            const rv = {
                hash: block.hash,
                number: block.number,
                timestamp: block.timestamp,
                transactionIds: [],
                transactions: [],
            };
            allTransactions.forEach((v) => {
                if (!!v) {
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
    getTransactionById(tid) {
        return __awaiter(this, void 0, void 0, function* () {
            return ferrum_plumbing_1.retry(() => __awaiter(this, void 0, void 0, function* () {
                const web3 = new web3_1.default(new web3_1.default.providers.HttpProvider(this.provider));
                const transaction = yield web3.eth.getTransaction(tid);
                if (!transaction) {
                    return undefined;
                }
                let transactionReceipt = yield web3.eth.getTransactionReceipt(tid);
                const currentBlock = yield web3.eth.getBlockNumber();
                let confirmed = transactionReceipt.blockNumber === null ? 0 : currentBlock - transactionReceipt.blockNumber;
                let is_confirmed = confirmed >= this.requiredConfirmations;
                if (!transactionReceipt) {
                    const msg = 'EthereumClient.getTransactionById: Transaction did not have any receipt / logs: ' + tid;
                    console.error(msg);
                    throw new ferrum_plumbing_1.RetryableError(msg);
                }
                if (!transactionReceipt.status) {
                    // Transaction failed.
                    return {
                        network: "ETHEREUM",
                        fee: transactionReceipt['gasUsed'],
                        feeCurrency: "ETH",
                        feeDecimals: ETH_DECIMALS,
                        from: { address: transaction.from,
                            currency: '',
                            amount: 0 },
                        to: { address: transaction.to,
                            currency: '',
                            amount: 0 },
                        confirmed: false,
                        confirmationTime: 0,
                        failed: true,
                        id: transactionReceipt['transactionHash']
                    };
                }
                let logs = transactionReceipt['logs'];
                if (logs !== undefined) {
                    let len = logs.length;
                    if (len > 1) { // multi transfer by contract function.
                        console.warn('Received a transaction with more than 1 log items. Not supported', transaction, transactionReceipt);
                        return undefined;
                    }
                    else if (len === 1) { // normal token to token transaction
                        const decodedLogs = abi_decoder_1.default.decodeLogs(logs).filter((log) => log);
                        if (decodedLogs.length > 0) {
                            let decodedLog = decodedLogs[0];
                            if (decodedLog.name === "Transfer") {
                                let contractinfo = this.findContractInfo(decodedLog.address);
                                const decimals = contractinfo.decimal;
                                const decimalUnit = DecimalToUnit[decimals.toFixed()];
                                ferrum_plumbing_1.ValidationUtils.isTrue(!!decimalUnit, `Deciman ${contractinfo.decimal} does not map to a unit`);
                                let transferData = {
                                    network: "ETHEREUM",
                                    fee: Number(web3.utils.fromWei(new bn_js_1.default(transactionReceipt['gasUsed']), decimalUnit)),
                                    feeCurrency: "ETH",
                                    feeDecimals: ETH_DECIMALS,
                                    from: { address: decodedLog.events[0].value,
                                        currency: contractinfo.name,
                                        amount: Number(web3.utils.fromWei(new bn_js_1.default(decodedLog.events[2].value), decimalUnit)),
                                        decimals,
                                    },
                                    to: { address: decodedLog.events[1].value,
                                        currency: contractinfo.name,
                                        amount: Number(web3.utils.fromWei(new bn_js_1.default(decodedLog.events[2].value), decimalUnit)),
                                        decimals,
                                    },
                                    confirmed: is_confirmed,
                                    confirmationTime: 0,
                                    failed: false,
                                    id: transactionReceipt['transactionHash']
                                };
                                return transferData;
                            }
                        }
                        return undefined;
                    }
                    else { // normal eth to eth transaction.
                        let res = {
                            network: "ETHEREUM",
                            fee: transactionReceipt['gasUsed'],
                            feeCurrency: "ETH",
                            from: {
                                address: transactionReceipt["from"],
                                currency: "ETH",
                                amount: Number(web3.utils.fromWei(new bn_js_1.default(transaction['value']), "ether")),
                                decimals: ETH_DECIMALS,
                            },
                            to: {
                                address: transactionReceipt["to"],
                                currency: "ETH",
                                amount: Number(web3.utils.fromWei(new bn_js_1.default(transaction['value']), "ether")),
                                decimals: ETH_DECIMALS,
                            },
                            confirmed: is_confirmed,
                            confirmationTime: 0,
                            failed: false,
                            id: transactionReceipt['transactionHash']
                        };
                        return res;
                    }
                }
                return undefined;
            }));
        });
    }
    processPaymentFromPrivateKey(skHex, targetAddress, currency, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.processPaymentFromPrivateKeyWithGas(skHex, targetAddress, currency, amount, 0);
        });
    }
    processPaymentFromPrivateKeyWithGas(skHex, targetAddress, currency, amount, gasOverride) {
        if (currency === this.feeCurrency()) {
            return this.sendEth(skHex, targetAddress, amount);
        }
        const contract = this.contractAddresses[currency];
        const decimal = this.decimals[currency];
        const amountBN = web3_1.default.utils.toBN(Math.floor(amount * Math.pow(10, decimal)));
        ferrum_plumbing_1.ValidationUtils.isTrue(!!contract, 'Unknown contract address for currency: ' + currency);
        return this.sendTransaction(contract, skHex, targetAddress, amountBN, gasOverride);
    }
    sendTransaction(contractAddress, privateKey, to, amount, gasOverride) {
        return __awaiter(this, void 0, void 0, function* () {
            const privateKeyHex = '0x' + privateKey;
            const web3 = this.web3();
            const addressFrom = web3.eth.accounts.privateKeyToAccount(privateKeyHex);
            let sendAmount = amount; //web3.utils.toWei(amount, 'ether');
            const consumerContract = new web3.eth.Contract(abi.abi, contractAddress);
            const myData = consumerContract.methods.transfer(to, '0x' + sendAmount.toString('hex')).encodeABI();
            const from = addressFrom.address;
            const targetBalance = yield this.getBalanceForContract(web3, to, contractAddress, 1);
            const requiredGas = targetBalance > 0 ? GasPriceProvider_1.EthereumGasPriceProvider.ERC_20_GAS_NON_ZERO_ACCOUNT :
                GasPriceProvider_1.EthereumGasPriceProvider.ERC_20_GAS_ZERO_ACCOUNT;
            let gasPrice = (gasOverride || 0) / requiredGas;
            if (!gasOverride) {
                gasPrice = (yield this.gasService.getGasPrice()).medium;
            }
            const tx = {
                from,
                to: contractAddress,
                value: '0',
                gasPrice: web3.utils.toWei(gasPrice.toFixed(12), 'ether'),
                gas: requiredGas,
                chainId: this.networkStage === 'test' ? 4 : 1,
                nonce: yield web3.eth.getTransactionCount(from, 'pending'),
                data: myData
            };
            console.log('About to submit transaction:', tx);
            const signed = yield web3.eth.accounts.signTransaction(tx, privateKeyHex);
            const rawTx = signed.rawTransaction;
            const sendRawTx = (rawTx) => new Promise((resolve, reject) => web3.eth
                .sendSignedTransaction(rawTx)
                .on('transactionHash', resolve)
                .on('error', reject));
            return yield sendRawTx(rawTx);
        });
    }
    /**
     * Note: This only returns incoming transactions to the given address and only works for ERC20 transactions
     */
    getRecentTransactionsByAddress(address) {
        return __awaiter(this, void 0, void 0, function* () {
            const web3 = this.web3();
            const tokens = Object.keys(this.contractAddresses);
            const res = [];
            for (let tok of tokens) {
                let erc20Contract = new web3.eth.Contract(abi.abi, this.contractAddresses[tok]);
                const pastEvents = yield erc20Contract.getPastEvents('Transfer', {
                    fromBlock: 0,
                    toBlock: 'latest',
                    filter: { to: address }
                });
                pastEvents.forEach((event) => {
                    const decimals = this.decimals[tok];
                    const decimalUnit = DecimalToUnit[decimals];
                    const amount = Number(web3.utils.fromWei(event.returnValues.value, decimalUnit));
                    res.push({
                        network: "ETHEREUM",
                        fee: 0,
                        feeCurrency: "ETH",
                        from: {
                            address: event.returnValues.from,
                            currency: tok,
                            amount: amount,
                            decimals
                        },
                        to: {
                            address: event.returnValues.to,
                            currency: tok,
                            amount: amount,
                            decimals
                        },
                        confirmed: true,
                        confirmationTime: 0,
                        failed: false,
                        id: event['transactionHash'],
                    });
                });
            }
            return res;
        });
    }
    sendEth(privateKey, to, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const privateKeyHex = '0x' + privateKey;
            const web3 = new web3_1.default(new web3_1.default.providers.HttpProvider(this.provider));
            const addressFrom = web3.eth.accounts.privateKeyToAccount(privateKeyHex);
            let sendAmount = web3.utils.toWei(amount.toFixed(12), 'ether');
            const from = addressFrom.address;
            const gasPrice = (yield this.gasService.getGasPrice()).medium;
            const tx = {
                from,
                to: to,
                value: sendAmount,
                gasPrice: web3.utils.toWei(gasPrice.toFixed(12), 'ether'),
                gas: GasPriceProvider_1.EthereumGasPriceProvider.ETH_TX_GAS,
                chainId: this.networkStage === 'test' ? 4 : 1,
                nonce: yield web3.eth.getTransactionCount(from, 'pending'),
            };
            console.log('About to submit transaction:', tx);
            const signed = yield web3.eth.accounts.signTransaction(tx, privateKeyHex);
            const rawTx = signed.rawTransaction;
            const sendRawTx = (rawTx) => new Promise((resolve, reject) => web3.eth
                .sendSignedTransaction(rawTx)
                .on('transactionHash', resolve)
                .on('error', reject));
            return yield sendRawTx(rawTx);
        });
    }
    getBalance(address, currency) {
        return __awaiter(this, void 0, void 0, function* () {
            const web3 = this.web3();
            if (currency === types_1.NetworkNativeCurrencies.ETHEREUM) {
                const bal = yield web3.eth.getBalance(address);
                return Number(web3.utils.fromWei(bal, 'ether'));
            }
            else {
                ferrum_plumbing_1.ValidationUtils.isTrue(this.contractAddresses[currency], `No contract address is configured for '${currency}'`);
                const contractAddress = this.contractAddresses[currency];
                return this.getBalanceForContract(web3, address, contractAddress, this.decimals[currency]);
            }
        });
    }
    getBalanceForContract(web3, address, contractAddress, decimals) {
        return __awaiter(this, void 0, void 0, function* () {
            let erc20Contract = new web3.eth.Contract(abi.abi, contractAddress);
            const bal = yield erc20Contract.methods.balanceOf(address).call();
            const bn = web3.utils.toBN(bal);
            return bn.toNumber() / Math.pow(10, decimals);
        });
    }
    waitForTransaction(transactionId) {
        return __awaiter(this, void 0, void 0, function* () {
            return ChainUtils_1.waitForTx(this, transactionId, this.txWaitTimeout, ChainUtils_1.ChainUtils.TX_FETCH_TIMEOUT * 10);
        });
    }
    web3() {
        console.log('Using http provider', this.provider);
        return new web3_1.default(new web3_1.default.providers.HttpProvider(this.provider));
    }
}
exports.EthereumClient = EthereumClient;
//# sourceMappingURL=EthereumClient.js.map