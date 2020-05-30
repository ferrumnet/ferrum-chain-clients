import BN from 'bn.js';
import Web3 from 'web3';
import {
    BlockData,
    ChainClient, EcSignature, GasParameters,
    MultiChainConfig,
    NetworkNativeCurrencies,
    NetworkStage, SignableTransaction,
    SimpleTransferTransaction, SimpleTransferTransactionItem
} from "./types";
// @ts-ignore
import abiDecoder from 'abi-decoder';
import * as abi from '../resources/erc20-abi.json';
import {ValidationUtils, HexString, retry, RetryableError} from 'ferrum-plumbing';
import {ChainUtils, ETH_DECIMALS, waitForTx} from './ChainUtils';
import {EthereumGasPriceProvider, GasPriceProvider} from './GasPriceProvider';
import {Transaction} from "ethereumjs-tx";
import {hexToUtf8} from "ferrum-crypto";
import {ecsign} from 'ethereumjs-util';
import {Log, TransactionReceipt} from 'web3-core/types';

const BLOCK_CACH_TIMEOUT = 10 * 1000;
const ERC_20_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const HACK_ZERO_REPLACEMENT = '0x0000000000000000000000000000000000000001';

function toDecimal(amount: any, decimals: number): string {
    return ChainUtils.toDecimalStr(amount, decimals);
}

function toWei(decimals: number, amount: string): BN {
    return new BN(ChainUtils.toBigIntStr(amount, decimals));
}

function transactionLogHasErc20Transfer(log: Log) {
    const topics = log.topics || [];
    const nonZeroData = log.data && log.data !== '0x' && log.data !== '0X';
    return nonZeroData && topics.length > 1 && topics[0] === ERC_20_TOPIC
}

export abstract class EthereumClient implements ChainClient {
    private readonly provider: string;
    private readonly requiredConfirmations: number;
    private readonly txWaitTimeout: number;
    protected constructor(private networkStage: NetworkStage, config: MultiChainConfig, private gasService: GasPriceProvider) {
        this.provider = networkStage === 'test' ? config.web3ProviderRinkeby : config.web3Provider;
        this.requiredConfirmations = config.requiredEthConfirmations !== undefined ? config.requiredEthConfirmations : 1;
        this.txWaitTimeout = config.pendingTransactionShowTimeout
          || ChainUtils.DEFAULT_PENDING_TRANSACTION_SHOW_TIMEOUT * 10;
        abiDecoder.addABI(abi.abi);
    }

    protected network(){ return this.networkStage === 'prod' ? 'ETHEREUM' : 'RINKEBY'};

    feeCurrency(): string { return this.networkStage === 'prod' ? 'ETHEREUM:ETH' : 'RINKEBY:ETH'; }

    feeDecimals(): number { return ETH_DECIMALS; }

    async getBlockByNumber(number: number): Promise<BlockData> {
        const block = await this.web3().eth.getBlock(number);
        const rv = {
            hash: block.hash,
            number: block.number,
            timestamp: block.timestamp,
            transactionIds: [],
            transactions: [],
        } as BlockData;
        const transactions = block.transactions as any as string[];
        // for(let tid of transactions) {
        //     const v = await this.getTransactionById(tid);
        //     if (v) {
        //         v.confirmationTime = block.timestamp * 1000;
        //         rv.transactionIds.push(v.id);
        //         rv.transactions!.push(v);
        //     }
        // }
        const transactionsF = transactions.map((tid: string) => this.getTransactionById(tid));
        const allTransactions = await Promise.all(transactionsF);
        allTransactions.forEach((v) => {
            if (!!v) {
                v.confirmationTime = (block.timestamp as number) * 1000;
                rv.transactionIds.push(v.id);
                rv.transactions!.push(v);
            }
        });
        return rv;
    }

    async getBlockNumber(): Promise<number> {
        return await this.web3().eth.getBlockNumber();
    }

    private lastBlockNumber: number = 0;
    private lastBlockRead: number = 0;

    async getCachedCurrentBlock(): Promise<number> {
        if ((Date.now() - this.lastBlockRead) < BLOCK_CACH_TIMEOUT) {
            return this.lastBlockNumber;
        }
        return this.getBlockNumber();
    }

    async getTransactionById(tid: string, includePending: boolean = false): Promise<SimpleTransferTransaction | undefined> {
        return retry(async () => {
            try {
                const web3 = new Web3(new Web3.providers.HttpProvider(this.provider));
                const transaction = await web3.eth.getTransaction(tid);
                if (!transaction) {
                    return undefined;
                }
                if (!transaction.blockHash && !transaction.blockNumber && !includePending) {
                    return undefined;
                }
                let transactionReceipt = await web3.eth.getTransactionReceipt(tid);
                if (!transactionReceipt) {
                    const fee = Web3.utils.fromWei(
                        new BN(transaction.gasPrice).muln(transaction.gas), 'ether');
                    return {
                        confirmed: false,
                        failed: false,
                        fee,
                        feeCurrency: this.feeCurrency(),
                        id: transaction.hash,
                        network: this.network(),
                        feeDecimals: this.feeDecimals(),
                        fromItems: [{
                            address: transaction.from,
                            currency: '', // TODO: If to is a contract
                            amount: '0'
                        }],
                        toItems: [{
                            address: transaction.to,
                            currency: '', // TODO: If to is a contract
                            amount: '0'
                        }],
                        singleItem: true,
                    } as SimpleTransferTransaction;
                }
                const currentBlock = await this.getCachedCurrentBlock();
                let confirmed = transactionReceipt.blockNumber === null ? 0 : Math.max(1, currentBlock - transactionReceipt.blockNumber);
                let is_confirmed = confirmed >= this.requiredConfirmations;
                if (!transactionReceipt) {
                    const msg = 'EthereumClient.getTransactionById: Transaction did not have any receipt / logs: ' + tid;
                    console.error(msg);
                    throw new RetryableError(msg);
                }
                const fee = Web3.utils.fromWei(new BN(transaction.gasPrice).muln(transactionReceipt.gasUsed), 'ether');
                if (!transactionReceipt.status) {
                    // Transaction failed.
                    const reason = await EthereumClient.getTransactionError(web3, transaction);
                    return {
                        network: this.network(),
                        fee: fee,
                        feeCurrency: this.feeCurrency(),
                        feeDecimals: ETH_DECIMALS,
                        fromItems: [{
                            address: transactionReceipt["from"],
                            currency: '', // TODO: If to is a contract
                            amount: '0'
                        }],
                        toItems: [{
                            address: transactionReceipt["to"],
                            currency: '',
                            amount: '0'
                        }],
                        confirmed: false,
                        confirmationTime: 0,
                        failed: true,
                        id: transactionReceipt['transactionHash'],
                        singleItem: true,
                        reason,
                    } as SimpleTransferTransaction;
                }
                let logs = transactionReceipt['logs'];
                logs = (logs || []).filter(transactionLogHasErc20Transfer);
                // TODO: This is a hack to fix bug with web3 https://github.com/ethereum/web3.js/issues/3134
                // Remove once the bug is fixed
                // logs.forEach(l =>
                //   (l.topics || []).forEach((t, i) => {
                //       const isZ = new BN(t.slice(2) || '0', 'hex').isZero();
                //       if (isZ) { l.topics[i] = HACK_ZERO_REPLACEMENT; }
                //   }
                // ));

                if (logs !== undefined) {
                    let decodedLogs: any[] = [];
                    try {
                        decodedLogs = abiDecoder.decodeLogs(logs)
                          .filter((log: any) => log && log.name === "Transfer");
                    } catch (e) {
                        console.warn('Error decoding logs for transaction ', tid, e);
                    }
                    const len = decodedLogs.length;
                    if (len > 0) { // ERC-20 transaction
                        return this.processErc20Transaction(fee, is_confirmed, transactionReceipt as any, decodedLogs);
                    } else { // normal eth to eth transaction.
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
                                amount: web3.utils.fromWei(new BN(transaction['value']), "ether"),
                                decimals: ETH_DECIMALS,
                            }],
                            toItems: [{
                                address: transactionReceipt["to"],
                                currency: cur,
                                amount: web3.utils.fromWei(new BN(transaction['value']), "ether"),
                                decimals: ETH_DECIMALS,
                            }],
                            confirmed: is_confirmed,
                            confirmationTime: 0,
                            failed: false,
                            id: transactionReceipt['transactionHash'],
                            singleItem: true,
                        } as SimpleTransferTransaction;
                    }
                }
                return undefined;
            } catch (e) {
                console.warn('Error processing transaction ', tid, e);
                if (e.toString().indexOf('JSON RPC') >= 0) {
                    throw new RetryableError(e.message);
                }
            }
        });
    }

    async processPaymentFromPrivateKey(skHex: HexString, targetAddress: string, currency: string,
                                       amount: string):
      Promise<string> {
        return this.processPaymentFromPrivateKeyWithGas(skHex, targetAddress, currency, amount, '0');
    }

    async processPaymentFromPrivateKeyWithGas(skHex: string, targetAddress: string, currency: string,
                                              amount: string, gasOverride: string | GasParameters): Promise<string> {
        let tx: SignableTransaction | undefined = undefined;
        const web3 = this.web3();
        const privateKeyHex = '0x' + skHex;
        const addressFrom = web3.eth.accounts.privateKeyToAccount(privateKeyHex);
        if (currency === this.feeCurrency()) {
            tx = await this.createSendEth(addressFrom.address, targetAddress, amount, gasOverride);
        } else {
            tx = await this.createErc20SendTransaction(currency, addressFrom.address, targetAddress, amount,
              (bal: string) => this.getGas(true, currency, bal, gasOverride));
        }
        const signed = await this.signTransaction(skHex, tx!);
        return this.broadcastTransaction(signed);
    }

    private static async getGasLimit(erc20: boolean, currency: string, targetBalance: string): Promise<number> {
        if (erc20) {
            return EthereumGasPriceProvider.gasLimiForErc20(currency, targetBalance || '0');
        } else {
            return EthereumGasPriceProvider.ETH_TX_GAS;
        }
    }

    private async getGas(erc20: boolean, currency: string, targetBalance: string,
                         gasOverride?: string | GasParameters,): Promise<[string, number]> {
        if (!!gasOverride && typeof gasOverride === 'object') {
            const go = gasOverride as GasParameters;
            const gasLimit = go.gasLimit && Number.isFinite(Number(go.gasLimit)) ?
              Number(go.gasLimit) : await EthereumClient.getGasLimit(erc20, currency, targetBalance);
            const gasPrice = ChainUtils.toBigIntStr(go.gasPrice, ETH_DECIMALS);
            return [gasPrice, gasLimit];
        }

        const gasLimit = await EthereumClient.getGasLimit(erc20, currency, targetBalance);
        if (erc20) {
            const gasOverrideBN = new BN(Web3.utils.toWei(gasOverride || '0', 'ether'));
            let gasPriceBN = gasOverrideBN.divn(gasLimit);
            if (gasPriceBN.muln(gasLimit).gt(gasOverrideBN)) {
                ValidationUtils.isTrue(false, `Error calculating gas price from override (${gasOverride}.` +
                  ` Limit was ${gasLimit} but the calculated price ${gasPriceBN.toString()} generates a higher gas than overriden limit`);
            }
            if (!gasOverride) {
                return [(await this.gasService.getGasPrice()).medium, gasLimit];
            }
            return [gasPriceBN.toString(), gasLimit];
        }

        if (!gasOverride) {
            const bestGasPrice = (await this.gasService.getGasPrice()).medium;
            return [ChainUtils.toBigIntStr(bestGasPrice, ETH_DECIMALS), gasLimit];
        }
        let gasPriceBN = new BN(ChainUtils.toBigIntStr(gasOverride, ETH_DECIMALS) || '0').divn(gasLimit);
        return [gasPriceBN.toString(), gasLimit];
    }


    private async createSendEth(from: string,
                                to: string,
                                amount: string,
                                gasOverride?: string | GasParameters,
                                nonce?: number,
                                ): Promise<SignableTransaction> {
        const web3 = this.web3();
        let sendAmount = toWei(ETH_DECIMALS, amount);
        const [gasPrice, gasLimit] = await this.getGas(false, this.feeCurrency(), '0', gasOverride);
        const params = {
            nonce: nonce || await web3.eth.getTransactionCount(from, 'pending'),
            gasPrice: '0x' + new BN(gasPrice).toString('hex'),
            gasLimit: '0x' + new BN(gasLimit).toString('hex'),
            to: to,
            value: '0x' + sendAmount.toString('hex'),
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
        let sigHex: EcSignature | undefined = undefined;
        ValidationUtils.isTrue(!Array.isArray(transaction.signature), 'Multiple sig eth not supported');
        if (transaction.signature && (transaction.signature as EcSignature).r) {
            // transaction is already signed. Just apply the signature
            sigHex = transaction.signature as EcSignature;
        } else {
            ValidationUtils.isTrue(!!transaction.signableHex, 'transaction has no signable hex');
            sigHex = await this.sign(skHex, transaction.signableHex!);
        }
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
        const rawTransaction = '0x' + transaction.serializedTransaction;
        const txIds = [''];
        // var transactionHash = utils.keccak256(rawTransaction);
        return new Promise<string>((resolve, reject) => {
            web3.eth.sendSignedTransaction(rawTransaction,
                (e, hash) => {
                    if (!!e) {
                        reject(e);
                    } else {
                        if (!!hash && !txIds[0]) {
                            txIds[0] = hash;
                            resolve(hash);
                        }
                    }
                },
            ).once('transactionHash', (txId: string) => {
                if (!txIds[0]) {
                    txIds[0] = txId;
                    resolve(txId);
                }
            })
        });
    }

    async createPaymentTransaction<Tx>(fromAddress: string, targetAddress: string,
                                       currency: string, amount: string, gasOverride?: string | GasParameters,
                                       memo?: string, nonce?: number,
                                       ): Promise<SignableTransaction> {
        if (currency === this.feeCurrency()) {
            return this.createSendEth(fromAddress, targetAddress, amount, gasOverride, nonce);
        }
        return this.createErc20SendTransaction(currency, fromAddress, targetAddress, amount,
          bal => this.getGas(true, currency, bal, gasOverride), nonce);
    }

    /**
     * Note: This only returns incoming transactions to the given address and only works for ERC20 transactions
     */
    async getRecentTransactionsByAddress(address: string, currencies: string[]): Promise<SimpleTransferTransaction[]> {
        const web3 = this.web3();
        const res: SimpleTransferTransaction[] = [];
        const tokens = currencies.map(ChainUtils.tokenPart);
        const _decimals: any = {};
        for (const tok of tokens) {
            _decimals[tok] = await this.getTokenDecimals(tok);
        }

        for (let tok of tokens) {
            let erc20Contract = new web3.eth.Contract(abi.abi as any, tok);
            const pastEvents = await erc20Contract.getPastEvents('Transfer', {
                fromBlock: 0,
                toBlock: 'latest',
                filter: {to: address}
            });

            pastEvents.forEach((event: any) => {
                const decimals = _decimals[tok] as number;
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
                } as SimpleTransferTransaction);
            });
        }
        return res;
    }

    async getBalance(address: string, currency: string) {
        const web3 = this.web3();
        if (currency === NetworkNativeCurrencies.ETHEREUM) {
            const bal = await web3.eth.getBalance(address);
            return web3.utils.fromWei(bal, 'ether');
        } else {
            const token = ChainUtils.tokenPart(currency);
            const decimals = await this.getTokenDecimals(token);
            return this.getBalanceForContract(web3, address, token, decimals);
        }
    }

    async getBalanceForContract(web3: Web3, address: string, contractAddress: string, decimals: number) {
        let erc20Contract = new web3.eth.Contract(abi.abi as any, contractAddress);
        const bal = await erc20Contract.methods.balanceOf(address).call();
        const bn = web3.utils.toBN(bal);
        return toDecimal(bn, decimals);
    }

    async waitForTransaction(transactionId: string): Promise<SimpleTransferTransaction | undefined> {
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
        return {chain: this.networkStage === 'test' ? 'rinkeby' : 'mainnet', hardfork: 'petersburg'};
    }

    private static async getTransactionError(web3: Web3, transaction: any) {
        try {
            const {from, to, gasPrice, gas, value, data, nonce} = transaction;
            const code = await web3.eth.call({from, to, gasPrice, gas, value, data, nonce}) as string;
            return hexToUtf8(code.substr(138)).replace(/\0/g, '');
        } catch (e) {
            // gobble
            return '';
        }
    }

    private async createErc20SendTransaction(
      currency: string, from: string, to: string, amount: string,
      gasProvider: (bal: string) => Promise<[string, number]>, nonce?: number): Promise<SignableTransaction> {
        const web3 = this.web3();
        const contractAddress = ChainUtils.tokenPart(currency);
        const consumerContract = new web3.eth.Contract(abi.abi as any, contractAddress);
        const decimals = await this.getTokenDecimals(contractAddress);
        let sendAmount = new BN(ChainUtils.toBigIntStr(amount, decimals));
        const myData = consumerContract.methods.transfer(to, '0x' + sendAmount.toString('hex')).encodeABI();
        const targetBalance = await this.getBalanceForContract(web3, to, contractAddress, 1);
        const [gasPrice, gasLimit] = await gasProvider(targetBalance);
        const params = {
            nonce: nonce || await web3.eth.getTransactionCount(from, 'pending'),
            gasPrice: '0x' + new BN(gasPrice).toString('hex'),
            gasLimit: '0x' + new BN(gasLimit).toString('hex'),
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

    private async processErc20Transaction(fee: string,
                                       confirmed: boolean,
                                       transactionReceipt: TransactionReceipt,
                                       logs: Log[]): Promise<SimpleTransferTransaction|undefined> {
        const tx = {
            network: this.network(),
            fee,
            feeCurrency: this.feeCurrency(),
            feeDecimals: ETH_DECIMALS,
            fromItems: [] as any,
            toItems: [] as any,
            confirmed,
            confirmationTime: 0,
            failed: false,
            id: transactionReceipt['transactionHash']
        } as SimpleTransferTransaction;
        const _decimals: any = {};
        const toks = new Set<string>();
        logs.forEach((decodedLog: any) => {
            if (decodedLog.name === 'Transfer') { toks.add(decodedLog.address); }
        });
        for(const tok of toks) {
            _decimals[tok] = await this.getTokenDecimals(tok);
        }
        logs.forEach((decodedLog: any) => {
            if (decodedLog.name === 'Transfer') {
                const tok = decodedLog.address;
                const decimals = _decimals[tok];
                const from = {
                    address: decodedLog.events[0].value,
                    currency: this.currencyForErc20(tok),
                    amount: toDecimal(decodedLog.events[2].value, decimals),
                    decimals,
                } as SimpleTransferTransactionItem;
                const to = {
                    address: decodedLog.events[1].value,
                    currency: this.currencyForErc20(tok),
                    amount: toDecimal(decodedLog.events[2].value, decimals),
                    decimals,
                } as SimpleTransferTransactionItem;
                tx.fromItems.push(from);
                tx.toItems.push(to);
            }
        });
        return tx;
    }

    private currencyForErc20(tok: string) {
        return `${this.network()}:${ChainUtils.canonicalAddress(this.network(), tok)}`;
    }

    protected abstract getTokenDecimals(tok: string): Promise<number>;
}
