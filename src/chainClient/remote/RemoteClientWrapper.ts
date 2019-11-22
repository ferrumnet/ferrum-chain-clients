import {ChainClient} from "../types";
import {RemoteSignerClient} from "./RemoteSignerClient";

export class RemoteClientWrapper implements ChainClient {
    constructor(private client: ChainClient, private signer: RemoteSignerClient) { }

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

    sign = this.signer.sign;
}