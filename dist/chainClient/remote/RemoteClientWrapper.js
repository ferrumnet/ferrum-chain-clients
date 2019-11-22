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
    }
}
exports.RemoteClientWrapper = RemoteClientWrapper;
//# sourceMappingURL=RemoteClientWrapper.js.map