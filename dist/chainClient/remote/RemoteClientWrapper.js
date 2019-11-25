"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RemoteClientWrapper {
    constructor(client, signer) {
        this.client = client;
        this.signer = signer;
        this.broadcastTransaction = this.client.broadcastTransaction;
        this.createPaymentTransaction = this.client.createPaymentTransaction;
        this.feeCurrency = this.client.feeCurrency;
        this.getBalance = this.client.getBalance;
        this.getBlockByNumber = this.client.getBlockByNumber;
        this.getBlockNumber = this.client.getBlockNumber;
        this.getRecentTransactionsByAddress = this.client.getRecentTransactionsByAddress;
        this.getTransactionById = this.client.getTransactionById;
        this.processPaymentFromPrivateKey = this.client.processPaymentFromPrivateKey;
        this.processPaymentFromPrivateKeyWithGas = this.client.processPaymentFromPrivateKeyWithGas;
        this.signTransaction = this.client.signTransaction;
        this.waitForTransaction = this.client.waitForTransaction;
        this.sign = this.signer.sign;
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
        this.sign = this.signer.sign.bind(this.signer);
        client.sign = this.signer.sign.bind(this.signer);
    }
}
exports.RemoteClientWrapper = RemoteClientWrapper;
//# sourceMappingURL=RemoteClientWrapper.js.map