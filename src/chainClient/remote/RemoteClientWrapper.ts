import {ChainClient, EcSignature} from "../types";
import {RemoteSignerClient} from "./RemoteSignerClient";
import {Network} from "ferrum-plumbing";

export class RemoteClientWrapper implements ChainClient {
    constructor(private client: ChainClient, private signer: RemoteSignerClient, private network: Network) {
        this.broadcastTransaction = this.client.broadcastTransaction.bind(this.client);
        this.createPaymentTransaction = this.client.createPaymentTransaction.bind(this.client);
        this.feeCurrency = this.client.feeCurrency.bind(this.client);
        this.getBalance = this.client.getBalance.bind(this.client);
        this.getBlockByNumber = this.client.getBlockByNumber.bind(this.client);
        this.getBlockNumber = this.client.getBlockNumber.bind(this.client);
        this.getRecentTransactionsByAddress = this.client.getRecentTransactionsByAddress.bind(this.client);
        this.getTransactionById = this.client.getTransactionById.bind(this.client);
        this.processPaymentFromPrivateKey = this.client.processPaymentFromPrivateKey.bind(this.client);
        this.processPaymentFromPrivateKeyWithGas = this.client.processPaymentFromPrivateKeyWithGas.bind(this.client);
        this.waitForTransaction = this.client.waitForTransaction.bind(this.client);
        this.signTransaction = this.client.signTransaction.bind(this.client);
        client.sign = this.sign.bind(this);
    }

    broadcastTransaction = this.client.broadcastTransaction;
    createPaymentTransaction = this.client.createPaymentTransaction;
    feeCurrency = this.client.feeCurrency;
    getBalance = this.client.getBalance;
    getBlockByNumber = this.client.getBlockByNumber;
    getBlockNumber = this.client.getBlockNumber;
    getRecentTransactionsByAddress = this.client.getRecentTransactionsByAddress;
    getTransactionById = this.client.getTransactionById;
    processPaymentFromPrivateKey = this.client.processPaymentFromPrivateKey;
    processPaymentFromPrivateKeyWithGas = this.client.processPaymentFromPrivateKeyWithGas;
    signTransaction = this.client.signTransaction;
    waitForTransaction = this.client.waitForTransaction;

    sign(address: string, data: string, forceLow: boolean): Promise<EcSignature> {
        return this.signer.sign(this.network, address, data, forceLow);
    }
}