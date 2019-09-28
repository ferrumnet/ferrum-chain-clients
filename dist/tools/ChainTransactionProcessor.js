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
Object.defineProperty(exports, "__esModule", { value: true });
const ferrum_plumbing_1 = require("ferrum-plumbing");
class ChainTransactionProcessor {
    constructor(clientFactory) {
        this.clientFactory = clientFactory;
    }
    /**
     * TODO: Update to use signer instead of directly using sk
     * Submits a tx and transfer required fees if necessary. Returns all the created transactions.
     * @param fromSk
     */
    sendTokenUsingSk(network, feeProviderSk, fromSk, fromAddress, toAddress, currency, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = this.clientFactory.forNetwork(network);
            const fromBal = yield client.getBalance(fromAddress, currency);
            ferrum_plumbing_1.ValidationUtils.isTrue(fromBal >= amount, `Sender '${fromAddress}' does not have enough balance. Required ${amount}, available: ${fromBal}`);
            const gasPriceProvider = this.clientFactory.gasPriceProvider(network);
            const gasPrice = (yield gasPriceProvider.getGasPrice()).low;
            const requiredFee = gasPriceProvider.getTransactionGas(currency, gasPrice);
            const feeBal = yield client.getBalance(fromAddress, client.feeCurrency());
            const txs = [];
            if (feeBal < requiredFee) {
                // Transfer fee to address
                console.log('Transferring fee to address ', toAddress, requiredFee, client.feeCurrency());
                const feeTxId = yield client.processPaymentFromPrivateKey(feeProviderSk, fromAddress, client.feeCurrency(), requiredFee);
                const feeTx = yield client.waitForTransaction(feeTxId);
                if (!feeTx) {
                    throw new Error(`Could not transfer fee to address ${fromAddress}: getting the fee transaction timed out`);
                }
                if (feeTx.failed) {
                    throw new Error(`Could not transfer fee to address ${fromAddress}: Fee transaction '${feeTxId}' has failed`);
                }
                txs.push(feeTx);
            }
            console.log('Transferring amount to address ', toAddress, amount, currency);
            const finalTxId = yield client.processPaymentFromPrivateKey(fromSk, toAddress, currency, amount);
            const finalTx = yield client.waitForTransaction(finalTxId);
            if (!finalTx) {
                throw new Error(`Could not transfer from address ${fromAddress} to ${toAddress}: getting the transaction timed out.` +
                    txs.length ? `Note that there was a successful fee transaction ${txs[0].id}` : ``);
            }
            if (finalTx.failed) {
                throw new Error(`Could not transfer from address ${fromAddress} to ${toAddress}: the transaction failed.` +
                    txs.length ? `Note that there was a successful fee transaction ${txs[0].id}` : ``);
            }
            txs.push(finalTx);
            return txs;
        });
    }
    __name__() { return 'ChainTransactionProcessor'; }
}
exports.ChainTransactionProcessor = ChainTransactionProcessor;
//# sourceMappingURL=ChainTransactionProcessor.js.map