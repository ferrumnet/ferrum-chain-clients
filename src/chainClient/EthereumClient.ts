import BN from 'bn.js';
import Web3 from 'web3';
import {
    BlockData,
    ChainClient, EcSignature, GasParameters,
    MultiChainConfig,
    NetworkNativeCurrencies,
    NetworkStage, SignableTransaction,
    SimpleTransferTransaction, SimpleTransferTransactionItem, ContractCallRequest
} from "./types";
// @ts-ignore
import abiDecoder from 'abi-decoder';
import * as abi from '../resources/erc20-abi.json';
import {ValidationUtils, HexString, RetryableError, ServiceMultiplexer, Throttler, LoggerFactory, LocalCache, UsesServiceMultiplexer, Network} from 'ferrum-plumbing';
import {ChainUtils, ETH_DECIMALS, waitForTx} from './ChainUtils';
import {EthereumGasPriceProvider, GasPriceProvider} from './GasPriceProvider';
import {Transaction} from "ethereumjs-tx";
import {hexToUtf8} from "ferrum-crypto";
import {Log, TransactionReceipt} from 'web3-core/types';
import { ecsign } from 'ethereumjs-util';

const BLOCK_CACH_TIMEOUT = 10 * 1000;
const ERC_20_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const HACK_ZERO_REPLACEMENT = '0x0000000000000000000000000000000000000001';
import Common from 'ethereumjs-common';
import transaction from 'ethereumjs-tx';

export const ETHEREUM_CHAIN_ID_FOR_NETWORK = {
    'ETHEREUM': 1,
    'RINKEBY': 4,
    'BSC': 56,
    'BSC_TESTNET': 97,
    'POLYGON': 137,
    'MUMBAI_TESTNET': 80001,
} as any;

const ETHEREUM_CHAIN_NAME_FOR_NETWORK = {
    'ETHEREUM': 'mainnet',
    'RINKEBY': 'rinkeby',
    'BSC': 'mainnet',
    'BSC_TESTNET': 'testnet',
    'POLYGON': 'mainnet',
    'MUMBAI_TESTNET': 'mumbai',
} as any;

const ETHEREUM_CHAIN_SYMBOL_FOR_NETWORK = {
    'ETHEREUM': 'eth',
    'RINKEBY': 'eth',
    'BSC': 'bnb',
    'BSC_TESTNET': 'bnb',
    'POLYGON': 'matic',
    'MUMBAI_TESTNET': 'matic',
} as any;


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

function dontRetryError(e: Error) {
    const msg = e.toString();
    return !!['VM execution', ' gas'].find(m => msg.indexOf(m) > 0);
}

function base64(data: string) {
    let buff = Buffer.from(data);
    return buff.toString('base64');
}

export abstract class EthereumClient implements ChainClient, UsesServiceMultiplexer {
    private readonly requiredConfirmations: number;
    private readonly txWaitTimeout: number;
    providerMux: ServiceMultiplexer<Web3>;
    throttler: Throttler;
    private web3Instances: {[p: string]: Web3} = {};
    private _network: Network;
    protected constructor(net: Network, config: MultiChainConfig,
        private gasService: GasPriceProvider, logFac: LoggerFactory) {
        let provider = '';
        this._network = net;
        switch(net) {
            case 'ETHEREUM':
                provider = config.web3Provider;
                break;
            case 'RINKEBY':
                provider = config.web3ProviderRinkeby;
                break;
            case 'BSC':
                provider = config.web3ProviderBsc!;
                break;
            case 'BSC_TESTNET':
                provider = config.web3ProviderBscTestnet!;
                break;
            case 'POLYGON':
                provider = config.web3ProviderPolygon!;
                break;
            case 'MUMBAI_TESTNET':
                provider = config.web3ProviderMumbaiTestnet!;
                break;
        }
        ValidationUtils.isTrue(!!provider, `No provider is configured for '${net}'`);
        provider.split(',').map(p => {
            this.web3Instances[p] = this.web3Instance(p);
        });
        this.providerMux = new ServiceMultiplexer<Web3>(
            provider.split(',').map(p => () => this.web3Instances[p]), logFac, dontRetryError);
        this.throttler = new Throttler(
            Math.round(1000 / (config.ethereumTps || 20)) || 50); // TPS is 20 per second.
        this.requiredConfirmations = config.requiredEthConfirmations !== undefined ? config.requiredEthConfirmations : 1;
        this.txWaitTimeout = config.pendingTransactionShowTimeout
          || ChainUtils.DEFAULT_PENDING_TRANSACTION_SHOW_TIMEOUT * 10;
        abiDecoder.addABI(abi.abi);
    }

    setMode(mode: 'load-balance' | 'one-hot'): void {
        this.providerMux.updateMode(mode);
    }

    protected network(){ return this._network; };

    feeCurrency(): string { return (NetworkNativeCurrencies as any)[this._network]; }

    feeDecimals(): number { return ETH_DECIMALS; }

    async getBlockByNumber(number: number): Promise<BlockData> {
        await this.throttler.throttle();
        const block = await this.providerMux.retryAsync(web3 => web3.eth.getBlock(number));
        const rv = {
            hash: block!.hash,
            number: block!.number,
            timestamp: block!.timestamp,
            transactionIds: [],
            transactions: [],
        } as BlockData;
        const transactions = block!.transactions as any as string[];
        // for(let tid of transactions) {
        //     const v = await this.getTransactionById(tid);
        //     if (v) {
        //         v.confirmationTime = block.timestamp * 1000;
        //         rv.transactionIds.push(v.id);
        //         rv.transactions!.push(v);
        //     }
        // }
        const transactionsF = transactions.map((tid: string) => this.getTransactionByIdWithBlock(tid, false, number));
        const allTransactions = await Promise.all(transactionsF);
        allTransactions.forEach((v) => {
            if (!!v) {
                v.confirmationTime = (block!.timestamp as number) * 1000;
                rv.transactionIds.push(v.id);
                rv.transactions!.push(v);
            }
        });
        return rv;
    }

    async getBlockNumber(): Promise<number> {
        await this.throttler.throttle();
        const bNo = await this.providerMux.retryAsync(async web3 => web3.eth.getBlockNumber());
        return bNo!;
    }

    localCache = new LocalCache();
    async getCachedCurrentBlock(): Promise<number> {
        return this.localCache.getAsync('BLOCK_NO', () => this.getBlockNumber());
    }

    async getTransactionById(tid: string, includePending: boolean = false): Promise<SimpleTransferTransaction | undefined> {
        return this.getTransactionByIdWithBlock(tid, includePending);
    }

    private async getTransactionByIdWithBlock(tid: string,
            includePending: boolean = false, blockNo?: number): Promise<SimpleTransferTransaction | undefined> {
        return this.providerMux.retryAsync(async web3 => {
            try {
                await this.throttler.throttle();
                const transaction = await web3.eth.getTransaction(tid);
                if (!transaction) {
                    return undefined;
                }
                if (!transaction.blockHash && !transaction.blockNumber && !includePending) {
                    return undefined;
                }
                await this.throttler.throttle();
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
                const currentBlock = blockNo || await this.getCachedCurrentBlock();
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
              () => this.getGas(true, currency, addressFrom.address, targetAddress, amount, gasOverride));
        }
        const signed = await this.signTransaction(skHex, tx!);
        return this.broadcastTransaction(signed);
    }

    private async getGasLimit(erc20: boolean, currency: string, from: string, to: string,
            amount: string): Promise<number> {
        if (erc20) {
            return await this.erc20GasLimit(currency, from, to, amount); // To be calculated later
        } else {
            return EthereumGasPriceProvider.ETH_TX_GAS;
        }
    }

    protected async erc20GasLimit(currency: string, from: string, to: string, amountInt: string): Promise<number> {
        return 0;
    }

    private async getGas(erc20: boolean, currency: string, from: string, to: string, amount: string,
                         gasOverride?: string | GasParameters,): Promise<[string, number]> {
        if (!!gasOverride && typeof gasOverride === 'object') {
            const go = gasOverride as GasParameters;
            const gasLimit = go.gasLimit && Number.isFinite(Number(go.gasLimit)) ?
              Number(go.gasLimit) : await this.getGasLimit(erc20, currency, from, to, amount);;
            const gasPrice = ChainUtils.toBigIntStr(go.gasPrice, ETH_DECIMALS);
            return [gasPrice, gasLimit];
        }

        const gasLimit = await this.getGasLimit(erc20, currency, from, to, amount);
        if (erc20) {
            const gasOverrideBN = new BN(Web3.utils.toWei(gasOverride || '0', 'ether'));
            let gasPriceBN = gasOverrideBN.divn(gasLimit);
            if (gasPriceBN.muln(gasLimit).gt(gasOverrideBN)) {
                ValidationUtils.isTrue(false, `Error calculating gas price from override (${gasOverride}.` +
                  ` Limit was ${gasLimit} but the calculated price ${gasPriceBN.toString()} generates a higher gas than overriden limit`);
            }
            if (!gasOverride) {
                return [ChainUtils.toBigIntStr((await this.gasService.getGasPrice()).medium, ETH_DECIMALS), gasLimit];
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

    async createSendData(calls: ContractCallRequest[]) : Promise<SignableTransaction[]> {
        ValidationUtils.isTrue(calls && !!calls.length, '"calls" must be provided');
        const from = calls[0].from;
        ValidationUtils.isTrue(!calls.find(c => c.from !== from), "all calls must have same 'from'");
        const web3 = this.web3();
        let nonce = calls[0].nonce || await web3.eth.getTransactionCount(from, 'pending');
        const rv: SignableTransaction[] = [];
        for (let i = 0; i < calls.length; i++) {
            const call = calls[i];
            ValidationUtils.isTrue(!!call.data, "call.data is required");
            const gasPrice = new BN(ChainUtils.toBigIntStr(call.gas.gasPrice, ETH_DECIMALS));
            const gasLimit = new BN(call.gas.gasLimit);
            ValidationUtils.isTrue(gasPrice.gt(new BN(0)), "gasPrice must be provided for all calls");
            ValidationUtils.isTrue(gasLimit.gt(new BN(0)), "gasLimit must be provided for all calls");
            const value = new BN(ChainUtils.toBigIntStr(call.amount || '0', ETH_DECIMALS));
            const params = {
                nonce: call.nonce || (nonce + i),
                gasPrice: '0x' + gasPrice.toString('hex'),
                gasLimit: '0x' + gasLimit.toString('hex'),
                to: call.contract,
                value: '0x' + value.toString('hex'),
                data: '0x' + call.data,
            } as any;
            const tx = new Transaction(params, this.getChainOptions());
            const serialized = tx.serialize().toString('hex');
            rv.push({
                serializedTransaction: serialized,
                signableHex: tx.hash(false).toString('hex'),
                transaction: params,
            } as SignableTransaction);
        }
        return rv;
    }

    private async createSendEth(from: string,
                                to: string,
                                amount: string,
                                gasOverride?: string | GasParameters,
                                nonce?: number,
                                ): Promise<SignableTransaction> {
        const web3 = this.web3();
        let sendAmount = toWei(ETH_DECIMALS, amount);
        const [gasPrice, gasLimit] = await this.getGas(false, this.feeCurrency(), from, to, '0', gasOverride);
        if (!nonce) {
            await this.throttler.throttle();
        }
        const calcedNonce = nonce || await web3.eth.getTransactionCount(from, 'pending');
        const params = {
            nonce: '0x' + new BN(calcedNonce).toString('hex'),
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
          () => this.getGas(true, currency, fromAddress, targetAddress, amount, gasOverride), nonce);
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
                const currency = `${this.network()}:${tok}`
                const amount = toDecimal(event.returnValues.value, decimals);
                res.push({
                    network: this.network(),
                    fee: '0',
                    feeCurrency: this.feeCurrency(),
                    fromItems: [{
                        address: event.returnValues.from.toLowerCase(),
                        currency: currency,
                        amount: amount,
                        decimals
                    }],
                    toItems: [{
                        address: event.returnValues.to.toLowerCase(),
                        currency: currency,
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
        return this.providerMux.retryAsync(async web3 => {
            await this.throttler.throttle();
            if (currency === (NetworkNativeCurrencies as any)[this.network()]) {
                const bal = await web3.eth.getBalance(address);
                return web3.utils.fromWei(bal, 'ether');
            } else {
                const token = ChainUtils.tokenPart(currency);
                const decimals = await this.getTokenDecimals(token);
                return this.getBalanceForContract(web3, address, token, decimals);
            }
        });
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
        return this.providerMux.get();
    }

    private web3Instance(provider: string) {
        if (provider.toLocaleLowerCase().indexOf('@http') > 0) {
            const [cred, url] = provider.split('@', 2);
            const [user, pw] = (cred || '').split(':');
            ValidationUtils.isTrue(!!user && !!pw && !!url, 'Invalid basic auth provider url: ' + provider);
            const headers = [{
                  name: "Authorization",
                  value: "Basic " + base64(`${user}:${pw}`)
                }];
            const actualProvider = new Web3.providers.HttpProvider(url, {headers}); 
            return new Web3(actualProvider);
        } else {
            return new Web3(new Web3.providers.HttpProvider(provider));
        }
    }

    private getChainId() {
        return ETHEREUM_CHAIN_ID_FOR_NETWORK[this.network()];
    }

    private getChainOptions() {
        const chainName = ETHEREUM_CHAIN_NAME_FOR_NETWORK[this.network()];
        const common = Common.forCustomChain(chainName, {
        name: ETHEREUM_CHAIN_NAME_FOR_NETWORK[this.network()],
        networkId: this.getChainId(),
        chainId: this.getChainId(),
        }, 'petersburg');
        return {common};
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
      gasProvider: () => Promise<[string, number]>, nonce?: number): Promise<SignableTransaction> {
        const web3 = this.web3();
        const contractAddress = ChainUtils.tokenPart(currency);
        const consumerContract = new web3.eth.Contract(abi.abi as any, contractAddress);
        const decimals = await this.getTokenDecimals(contractAddress);
        let sendAmount = new BN(ChainUtils.toBigIntStr(amount, decimals));
        const myData = consumerContract.methods.transfer(to, '0x' + sendAmount.toString('hex')).encodeABI();
        const [gasPrice, gasLimit] = await gasProvider();
        if (!nonce) {
            await this.throttler.throttle();
        }
        const calcedNonce = nonce || await web3.eth.getTransactionCount(from, 'pending');
        const params = {
            nonce: '0x' + new BN(calcedNonce).toString('hex'),
            gasPrice: '0x' + new BN(gasPrice).toString('hex'),
            gasLimit: '0x' + new BN(gasLimit).toString('hex'),
            to: contractAddress,
            value: '0x',
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
