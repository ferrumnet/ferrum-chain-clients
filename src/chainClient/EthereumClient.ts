import BN from 'bn.js';
import Web3 from 'web3';
import {
    BlockData,
    ChainClient, EcSignature,
    MultiChainConfig,
    NetworkNativeCurrencies,
    NetworkStage, SignableTransaction,
    SimpleTransferTransaction
} from "./types";
// @ts-ignore
import abiDecoder from 'abi-decoder';
import * as abi from '../resources/erc20-abi.json';
import {ValidationUtils, HexString, retry, RetryableError} from 'ferrum-plumbing';
import {ChainUtils, waitForTx} from './ChainUtils';
import {EthereumGasPriceProvider, GasPriceProvider} from './GasPriceProvider';
import {Transaction} from "ethereumjs-tx";
// @ts-ignore
import {ecsign} from 'ethereumjs-utils';
import {hexToUtf8} from "ferrum-crypto";

const ETH_DECIMALS = 18;

const DecimalToUnit: { [k: string]: string } = {
    '1': 'wei',
    '3': 'kwei',
    '6': 'mwei',
    '9': 'gwei',
    '12': 'szabo',
    '15': 'finney',
    '18': 'ether',
};

export class EthereumClient implements ChainClient {
    private readonly provider: string;
    private readonly contractAddresses: any;
    private readonly decimals: any;
    private readonly requiredConfirmations: number;
    private readonly txWaitTimeout: number;
    constructor(private networkStage: NetworkStage, config: MultiChainConfig, private gasService: GasPriceProvider) {
        this.provider = config.web3Provider;
        this.contractAddresses = config.contractAddresses;
        this.decimals = config.contractDecimals as any;
        this.requiredConfirmations = config.requiredEthConfirmations !== undefined ? config.requiredEthConfirmations : 1;
        this.txWaitTimeout = config.pendingTransactionShowTimeout
            || ChainUtils.DEFAULT_PENDING_TRANSACTION_SHOW_TIMEOUT * 10;
        abiDecoder.addABI(abi.abi);
    }
    feeCurrency(): string {
        return 'ETH';
    }
    findContractInfo(contractAddress: string) {
        const coins = Object.keys(this.contractAddresses);
        const selectedCoin = coins
            .find(c => this.contractAddresses[c].toLowerCase() === contractAddress.toLowerCase());
        if (selectedCoin) {
            return {
                name: selectedCoin,
                address: this.contractAddresses[selectedCoin],
                decimal: this.decimals[selectedCoin] || 1,
            }
        }

        return {name: contractAddress.toLowerCase(), address: contractAddress, decimal: 1};
    }

    async getBlockByNumber(number: number): Promise<BlockData> {
        const block = await this.web3().eth.getBlock(number, false);
        const transactions = block.transactions as any as string[];
        const transactionsF = transactions.map((tid: string) => this.getTransactionById(tid));
        const allTransactions = await Promise.all(transactionsF);
        const rv = {
            hash: block.hash,
            number: block.number,
            timestamp: block.timestamp,
            transactionIds: [],
            transactions: [],
        } as BlockData;
        allTransactions.forEach((v) => {
            if (!!v) {
                v.confirmationTime = block.timestamp * 1000;
                rv.transactionIds.push(v.id);
                rv.transactions!.push(v);
            }
        });
        return rv;
    }

    async getBlockNumber(): Promise<number> {
        return await this.web3().eth.getBlockNumber();
    }

    async getTransactionById(tid: string): Promise<SimpleTransferTransaction|undefined> {
        return retry(async () => {
            try {
                const web3 = new Web3(new Web3.providers.HttpProvider(this.provider));
                const transaction = await web3.eth.getTransaction(tid);
                if (!transaction) {
                    return undefined;
                }
                let transactionReceipt = await web3.eth.getTransactionReceipt(tid);
                if (!transactionReceipt) {
                    return undefined;
                }
                const currentBlock = await web3.eth.getBlockNumber();
                let confirmed = transactionReceipt.blockNumber === null ? 0 : currentBlock - transactionReceipt.blockNumber;
                let is_confirmed = confirmed >= this.requiredConfirmations;
                if (!transactionReceipt) {
                    const msg = 'EthereumClient.getTransactionById: Transaction did not have any receipt / logs: ' + tid;
                    console.error(msg);
                    throw new RetryableError(msg);
                }
                const gasUsed = Number(web3.utils.fromWei(new BN(transactionReceipt['gasUsed']), 'ether'));
                const gasPrice = Number(transaction.gasPrice);
                const fee = gasUsed * gasPrice;
                if (!transactionReceipt.status) {
                    // Transaction failed.
                    const reason = await this.getTransactionError(web3, transaction);
                    return {
                        network: "ETHEREUM",
                        fee: fee,
                        feeCurrency: "ETH",
                        feeDecimals: ETH_DECIMALS,
                        from: {
                            address: transaction.from,
                            currency: '', // TODO: If to is a contract
                            amount: 0
                        },
                        to: {
                            address: transaction.to,
                            currency: '',
                            amount: 0
                        },
                        confirmed: false,
                        confirmationTime: 0,
                        failed: true,
                        id: transactionReceipt['transactionHash'],
                        reason,
                    } as SimpleTransferTransaction;
                }
                let logs = transactionReceipt['logs'];
                if (logs !== undefined) {
                    const decodedLogs = abiDecoder.decodeLogs(logs)
                        .filter((log: any) => log && log.name === "Transfer");
                    const len = decodedLogs.length;
                    if (len > 1) { // multi transfer by contract function.
                        // console.warn('Received a transaction with more than 1 log items. Not supported', transaction.hash);
                        return undefined;
                    } else if (len === 1) {  // normal token to token transaction
                        if (decodedLogs.length > 0) {
                            let decodedLog = decodedLogs[0];
                            if (decodedLog.name === "Transfer") {
                                let contractinfo = this.findContractInfo(decodedLog.address);
                                const decimals = contractinfo.decimal;
                                const decimalUnit: any = DecimalToUnit[decimals.toFixed()];
                                ValidationUtils.isTrue(!!decimalUnit, `Decimal ${contractinfo.decimal} does not map to a unit`);
                                let transferData = {
                                    network: "ETHEREUM",
                                    fee: fee,
                                    feeCurrency: "ETH",
                                    feeDecimals: ETH_DECIMALS,
                                    from: {
                                        address: decodedLog.events[0].value,
                                        currency: contractinfo.name,
                                        amount: Number(web3.utils.fromWei(new BN(decodedLog.events[2].value), decimalUnit)),
                                        decimals,
                                    },
                                    to: {
                                        address: decodedLog.events[1].value,
                                        currency: contractinfo.name,
                                        amount: Number(web3.utils.fromWei(new BN(decodedLog.events[2].value), decimalUnit)),
                                        decimals,
                                    },
                                    confirmed: is_confirmed,
                                    confirmationTime: 0,
                                    failed: false,
                                    id: transactionReceipt['transactionHash']
                                };
                                return transferData as SimpleTransferTransaction;
                            }
                        }
                        return undefined;
                    } else { // normal eth to eth transaction.
                        let res = {
                            network: "ETHEREUM",
                            fee: fee,
                            feeCurrency: "ETH",
                            from: {
                                address: transactionReceipt["from"],
                                currency: "ETH",
                                amount: Number(web3.utils.fromWei(new BN(transaction['value']), "ether")),
                                decimals: ETH_DECIMALS,
                            },
                            to: {
                                address: transactionReceipt["to"],
                                currency: "ETH",
                                amount: Number(web3.utils.fromWei(new BN(transaction['value']), "ether")),
                                decimals: ETH_DECIMALS,
                            },
                            confirmed: is_confirmed,
                            confirmationTime: 0,
                            failed: false,
                            id: transactionReceipt['transactionHash']
                        };
                        return res as SimpleTransferTransaction;
                    }
                }
                return undefined;
            } catch (e) {
                if (e.toString().indexOf('JSON RPC') >= 0) {
                    throw new RetryableError(e.message);
                }
            }
        });
    }

    async processPaymentFromPrivateKey(skHex: HexString, targetAddress: string, currency: string, amount: number):
        Promise<string> {
        return this.processPaymentFromPrivateKeyWithGas(skHex, targetAddress, currency, amount, 0);
    }

    async processPaymentFromPrivateKeyWithGas(skHex: string, targetAddress: string, currency: string,
                                        amount: number, gasOverride: number): Promise<string> {
        let tx: SignableTransaction|undefined = undefined;
        const web3 = this.web3();
        const privateKeyHex = '0x' + skHex;
        const addressFrom = web3.eth.accounts.privateKeyToAccount(privateKeyHex);
        if (currency === this.feeCurrency()) {
            tx = await this.createSendEth(addressFrom.address, targetAddress, amount, gasOverride);
        } else {
            const contract = this.contractAddresses[currency];
            const decimal = this.decimals[currency];
            const amountBN = Web3.utils.toBN(Math.floor(amount * 10 ** decimal));
            ValidationUtils.isTrue(!!contract, 'Unknown contract address for currency: ' + currency);
            tx = await this.createSendTransaction(contract, addressFrom.address, targetAddress, amountBN, gasOverride);
        }
        const signed = await this.signTransaction(skHex, tx);
        return this.broadcastTransaction(signed);
    }

    private async createSendTransaction(
        contractAddress: string, from: string,
        to: string, amount: BN, gasOverride: number): Promise<SignableTransaction> {
        const web3 = this.web3();
        let sendAmount = amount; //web3.utils.toWei(amount, 'ether');
        const consumerContract = new web3.eth.Contract(abi.abi, contractAddress);
        const myData = consumerContract.methods.transfer(to, '0x' + sendAmount.toString('hex')).encodeABI();
        const targetBalance = await this.getBalanceForContract(web3, to, contractAddress, 1);

        const requiredGas = targetBalance > 0 ? EthereumGasPriceProvider.ERC_20_GAS_NON_ZERO_ACCOUNT :
            EthereumGasPriceProvider.ERC_20_GAS_ZERO_ACCOUNT;
        let gasPrice = (gasOverride || 0) / requiredGas;
        if (!gasOverride) {
            gasPrice = (await this.gasService.getGasPrice()).medium;
        }
        const params = {
            nonce: await web3.eth.getTransactionCount(from,'pending'),
            gasPrice: Number(web3.utils.toWei(gasPrice.toFixed(12), 'ether')),
            gasLimit: requiredGas,
            to: contractAddress,
            value: 0,
            data: myData,
        };
        const tx = new Transaction(params,
            this.getChainOptions());

        const serialized = tx.serialize().toString('hex');
        return {
            serializedTransaction: serialized,
            signableHex: tx.hash(false).toString('hex'),
            transaction: params,
        } as SignableTransaction;
    }

    private async createSendEth(from: string, to: string, amount: number, gasOverride?: number): Promise<SignableTransaction> {
        const web3 = new Web3(new Web3.providers.HttpProvider(this.provider));
        let sendAmount = web3.utils.toWei(amount.toFixed(18), 'ether');
        const requiredGas = EthereumGasPriceProvider.ETH_TX_GAS;
        let gasPrice = (gasOverride || 0) / requiredGas;
        if (!gasOverride) {
            gasPrice = (await this.gasService.getGasPrice()).medium;
        }
        const params = {
            nonce: await web3.eth.getTransactionCount(from,'pending'),
            gasPrice: '0x' + new BN(web3.utils.toWei(gasPrice.toFixed(18), 'ether')).toString('hex'),
            gasLimit: '0x' + new BN(EthereumGasPriceProvider.ETH_TX_GAS).toString('hex'),
            to: to,
            value: '0x' + new BN(sendAmount).toString('hex'),
            data: '0x',
        };
        const tx = new Transaction(params, this.getChainOptions());

        const serialized = tx.serialize().toString('hex');
        // ValidationUtils.isTrue(tx.validate(), 'Ivalid transaction generated');
        return {
            serializedTransaction: serialized,
            signableHex: tx.hash(false).toString('hex'),
            transaction: params,
        } as SignableTransaction;
    }

    async signTransaction(skHex: HexString, transaction: SignableTransaction): Promise<SignableTransaction> {
        ValidationUtils.isTrue(!!transaction.signableHex, 'transaction has no signable hex');
        const sigHex = await this.sign(skHex, transaction.signableHex!);
        const tx = new Transaction('0x' + transaction.serializedTransaction, this.getChainOptions());
        // if (tx._implementsEIP155()) {
        //     sig.v += this.getChainId() * 2 + 8;
        // }
        Object.assign(tx, this.decodeSignature(sigHex));
        return {...transaction, serializedTransaction: tx.serialize().toString('hex')};
    }

    decodeSignature(sig: EcSignature): any {
        return {
            r: Buffer.from(sig.r, 'hex'),
            s: Buffer.from(sig.s, 'hex'),
            v: sig.v,
        };
    }

    async sign(skHex: HexString, data: HexString): Promise<EcSignature> {
        const sig = ecsign(Buffer.from(data, 'hex'), Buffer.from(skHex, 'hex'));
        sig.v += this.getChainId() * 2 + 8;
        return {r: sig.r.toString('hex'), s: sig.s.toString('hex'), v: sig.v};
    }

    async broadcastTransaction<T>(transaction: SignableTransaction): Promise<HexString> {
        const web3 = this.web3();
        const tx = new Transaction('0x' + transaction.serializedTransaction, this.getChainOptions());
        ValidationUtils.isTrue(tx.validate(), 'Provided transaction is invalid');
        ValidationUtils.isTrue(tx.verifySignature(), 'Signature cannot be verified');
        var rawTransaction = '0x' + transaction.serializedTransaction;
        // var transactionHash = utils.keccak256(rawTransaction);
        const sendRawTx = (rawTx: any) =>
            new Promise<string>((resolve, reject) =>
                web3.eth
                    .sendSignedTransaction(rawTx)
                    .on('transactionHash', resolve)
                    .on('error', reject)
            );

        return await sendRawTx(rawTransaction);
    }

    async createPaymentTransaction<Tx>(fromAddress: string, targetAddress: string,
                                currency: any, amount: number, gasOverride?: number): Promise<SignableTransaction> {
        if (currency === this.feeCurrency()) {
            return this.createSendEth(fromAddress, targetAddress, amount, gasOverride);
        }
        const contract = this.contractAddresses[currency];
        const decimal = this.decimals[currency];
        const amountBN = Web3.utils.toBN(Math.floor(amount * 10 ** decimal));
        ValidationUtils.isTrue(!!contract, 'Unknown contract address for currency: ' + currency);
        return this.createSendTransaction(contract, fromAddress, targetAddress, amountBN, gasOverride || 0);
    }

    /**
     * Note: This only returns incoming transactions to the given address and only works for ERC20 transactions
     */
    async getRecentTransactionsByAddress(address: string): Promise<SimpleTransferTransaction[]> {
        const web3 = this.web3();
        const tokens = Object.keys(this.contractAddresses);
        const res: SimpleTransferTransaction[] = [];
        for(let tok of tokens) {
            let erc20Contract = new web3.eth.Contract(abi.abi, this.contractAddresses[tok]);
            const pastEvents = await erc20Contract.getPastEvents('Transfer', {
                fromBlock: 0,
                toBlock: 'latest',
                filter: { to: address }
            });

            pastEvents.forEach((event: any) => {
                const decimals = this.decimals[tok];
                const decimalUnit: any = DecimalToUnit[decimals];
                const amount = Number(web3.utils.fromWei(event.returnValues.value, decimalUnit));
                res.push({
                    network: "ETHEREUM",
                    fee: 0,
                    feeCurrency: "ETH",
                    from: {
                        address: event.returnValues.from,
                        currency: tok,
                        amount: amount,
                        decimals},
                    to: {
                        address: event.returnValues.to,
                        currency: tok,
                        amount: amount,
                        decimals},
                    confirmed: true,
                    confirmationTime: 0,
                    failed: false,
                    id: event['transactionHash'],
                } as SimpleTransferTransaction);
            });
        }
        return res;
    }

    async getBalance(address: string, currency: string) {
        const web3 = this.web3();
        if (currency === NetworkNativeCurrencies.ETHEREUM) {
            const bal = await web3.eth.getBalance(address);
            return Number(web3.utils.fromWei(bal, 'ether'));
        } else {
            ValidationUtils.isTrue(this.contractAddresses[currency],
                `No contract address is configured for '${currency}'`);
            const contractAddress = this.contractAddresses[currency];
            return this.getBalanceForContract(web3, address, contractAddress, this.decimals[currency]);
        }
    }

    async getBalanceForContract(web3: Web3, address: string, contractAddress: string, decimals: number) {
        let erc20Contract = new web3.eth.Contract(abi.abi, contractAddress);
        const bal = await erc20Contract.methods.balanceOf(address).call();
        const bn = web3.utils.toBN(bal);
        return bn.toNumber() / Math.pow(10, decimals);
    }

    async waitForTransaction(transactionId: string): Promise<SimpleTransferTransaction|undefined> {
        return waitForTx(this, transactionId, this.txWaitTimeout, ChainUtils.TX_FETCH_TIMEOUT * 10)
    }

    web3() {
        // console.log('Using http provider', this.provider);
        return new Web3(new Web3.providers.HttpProvider(this.provider));
    }

    private getChainId() {
        return this.networkStage === 'test' ? 4 : 1;
    }

    private getChainOptions() {
        return { chain: this.networkStage === 'test' ? 'rinkeby' : 'mainnet', hardfork: 'petersburg' };
    }

    private async getTransactionError(web3: Web3, transaction: any) {
        const code = await web3.eth.call(transaction);
        return hexToUtf8(code.substr(138)).replace(/\0/g,'');
    }
}
