import BN from 'bn.js';
import Web3 from 'web3';
import {
    BlockData,
    ChainClient,
    MultiChainConfig,
    NetworkNativeCurrencies,
    NetworkStage,
    SimpleTransferTransaction
} from "./types";
// @ts-ignore
import abiDecoder from 'abi-decoder';
import * as abi from '../resources/erc20-abi.json';
import {ValidationUtils, HexString, retry, RetryableError} from 'ferrum-plumbing';
import {ChainUtils, waitForTx} from './ChainUtils';
import {EthereumGasPriceProvider, GasPriceProvider} from './GasPriceProvider';

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
        this.requiredConfirmations = config.requiredEthConfirmations || 1;
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
            const web3 = new Web3(new Web3.providers.HttpProvider(this.provider));
            const transaction = await web3.eth.getTransaction(tid);
            if (!transaction) {
                return undefined;
            }
            const currentBlock = await web3.eth.getBlockNumber();
            let confirmed = transaction.blockNumber === null ? 0 : currentBlock - transaction.blockNumber;
            let is_confirmed = confirmed >= this.requiredConfirmations;
            let transactionReceipt = await web3.eth.getTransactionReceipt(tid);
            if (!transactionReceipt) {
                const msg = 'EthereumClient.getTransactionById: Transaction did not have any receipt / logs: ' + tid;
                console.error(msg);
                throw new RetryableError(msg);
            }
            if (!transactionReceipt.status) {
                // Transaction failed.
                return  {
                    network: "ETHEREUM",
                    fee: transactionReceipt['gasUsed'],
                    feeCurrency: "ETH",
                    feeDecimals: ETH_DECIMALS,
                    from: {address: transaction.from,
                        currency: '', // TODO: If to is a contract
                        amount: 0},
                    to: {address: transaction.to,
                        currency: '',
                        amount: 0},
                    confirmed: false,
                    confirmationTime: 0,
                    failed: true,
                    id: transactionReceipt['transactionHash']
                } as SimpleTransferTransaction;
            }
            let logs = transactionReceipt['logs'];
            if (logs !== undefined) {
                let len = logs.length;
                if (len > 1){ // multi transfer by contract function.
                    console.warn('Received a transaction with more than 1 log items. Not supported', transaction,
                        transactionReceipt);
                    return undefined;
                } else if (len === 1){  // normal token to token transaction
                    const decodedLogs = abiDecoder.decodeLogs(logs).filter((log: any) => log);
                    if (decodedLogs.length > 0) {
                        let decodedLog = decodedLogs[0];
                        if (decodedLog.name === "Transfer") {
                            let contractinfo = this.findContractInfo(decodedLog.address);
                            const decimals = contractinfo.decimal;
                            const decimalUnit: any = DecimalToUnit[decimals.toFixed()];
                            ValidationUtils.isTrue(!!decimalUnit, `Deciman ${contractinfo.decimal} does not map to a unit`);
                            let transferData = {
                                network: "ETHEREUM",
                                fee: Number(web3.utils.fromWei(transactionReceipt['gasUsed'], decimalUnit)),
                                feeCurrency: "ETH",
                                feeDecimals: ETH_DECIMALS,
                                from: {address: decodedLog.events[0].value,
                                    currency: contractinfo.name,
                                    amount: Number(web3.utils.fromWei(decodedLog.events[2].value, decimalUnit)),
                                    decimals,
                                },
                                to: {address: decodedLog.events[1].value,
                                    currency: contractinfo.name,
                                    amount: Number(web3.utils.fromWei(decodedLog.events[2].value, decimalUnit)),
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
                        fee: transactionReceipt['gasUsed'],
                        feeCurrency: "ETH",
                        from: {
                            address: transactionReceipt["from"],
                            currency: "ETH",
                            amount: Number(web3.utils.fromWei(transaction['value'], "ether")),
                            decimals: ETH_DECIMALS,
                        },
                        to: {
                            address: transactionReceipt["to"],
                            currency: "ETH",
                            amount: Number(web3.utils.fromWei(transaction['value'], "ether")),
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
        });
    }

    async processPaymentFromPrivateKey(skHex: HexString, targetAddress: string, currency: string, amount: number):
        Promise<string> {
        return this.processPaymentFromPrivateKeyWithGas(skHex, targetAddress, currency, amount, 0);
    }

    processPaymentFromPrivateKeyWithGas(skHex: string, targetAddress: string, currency: string,
                                        amount: number, gasOverride: number): Promise<string> {
        if (currency === this.feeCurrency()) {
            return this.sendEth(skHex, targetAddress, amount);
        }
        const contract = this.contractAddresses[currency];
        const decimal = this.decimals[currency];
        const amountBN = Web3.utils.toBN(Math.floor(amount * 10 ** decimal));
        ValidationUtils.isTrue(!!contract, 'Unknown contract address for currency: ' + currency);
        return this.sendTransaction(contract, skHex, targetAddress, amountBN, gasOverride);
    }

    private async sendTransaction(contractAddress: string, privateKey: HexString, to: string, amount: BN,
                                  gasOverride: number) {
        const privateKeyHex = '0x' + privateKey;
        const web3 = this.web3();
        const addressFrom = web3.eth.accounts.privateKeyToAccount(privateKeyHex);

        let sendAmount = amount; //web3.utils.toWei(amount, 'ether');
        const consumerContract = new web3.eth.Contract(abi.abi, contractAddress);
        const myData = consumerContract.methods.transfer(to, '0x' + sendAmount.toString('hex')).encodeABI();
        const from = addressFrom.address;
        const targetBalance = await this.getBalanceForContract(web3, to, contractAddress, 1);

        const requiredGas = targetBalance > 0 ? EthereumGasPriceProvider.ERC_20_GAS_NON_ZERO_ACCOUNT :
            EthereumGasPriceProvider.ERC_20_GAS_ZERO_ACCOUNT;
        let gasPrice = (gasOverride || 0) / requiredGas;
        if (!gasOverride) {
            gasPrice = (await this.gasService.getGasPrice()).medium;
        }
        const tx = {
            from,
            to: contractAddress,
            value: '0',
            gasPrice: web3.utils.toWei(gasPrice.toFixed(12), 'ether'),
            gas: requiredGas,
            chainId: this.networkStage === 'test' ? 4 : 1,
            nonce: await web3.eth.getTransactionCount(from,'pending'),
            data: myData
        };
        console.log('About to submit transaction:', tx);

        const signed = await web3.eth.accounts.signTransaction(tx, privateKeyHex);
        const rawTx = signed.rawTransaction;

        const sendRawTx = (rawTx: any) =>
            new Promise<string>((resolve, reject) =>
                web3.eth
                    .sendSignedTransaction(rawTx)
                    .on('transactionHash', resolve)
                    .on('error', reject)
            );

        return await sendRawTx(rawTx);
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

    private async sendEth(privateKey: HexString, to: string, amount: number) {
        const privateKeyHex = '0x' + privateKey;
        const web3 = new Web3(new Web3.providers.HttpProvider(this.provider));
        const addressFrom = web3.eth.accounts.privateKeyToAccount(privateKeyHex);

        let sendAmount = web3.utils.toWei(amount.toFixed(12), 'ether');
        const from = addressFrom.address;
        const gasPrice = (await this.gasService.getGasPrice()).medium;
        const tx = {
            from,
            to: to,
            value: sendAmount,
            gasPrice: web3.utils.toWei(gasPrice.toFixed(12), 'ether'),
            gas: EthereumGasPriceProvider.ETH_TX_GAS,
            chainId: this.networkStage === 'test' ? 4 : 1,
            nonce: await web3.eth.getTransactionCount(from,'pending'),
        };
        console.log('About to submit transaction:', tx);

        const signed = await web3.eth.accounts.signTransaction(tx, privateKeyHex);
        const rawTx = signed.rawTransaction;

        const sendRawTx = (rawTx: any) =>
            new Promise<string>((resolve, reject) =>
                web3.eth
                    .sendSignedTransaction(rawTx)
                    .on('transactionHash', resolve)
                    .on('error', reject)
            );

        return await sendRawTx(rawTx);
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
        console.log('Using http provider', this.provider);
        return new Web3(new Web3.providers.HttpProvider(this.provider));
    }
}
