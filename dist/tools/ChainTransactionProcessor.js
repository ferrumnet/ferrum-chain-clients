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
    checkAccountRemainingFundsForFee(network, address, targetCurrency, requiredFee) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = this.clientFactory.forNetwork(network);
            const feeBal = (yield client.getBalance(address, client.feeCurrency())) || 0;
            return Math.min(0, requiredFee - feeBal);
        });
    }
    calculateTokenTransferFee(network, targetCurrnecy) {
        return __awaiter(this, void 0, void 0, function* () {
            const gasPriceProvider = this.clientFactory.gasPriceProvider(network);
            const gasPrice = (yield gasPriceProvider.getGasPrice()).low;
            return gasPriceProvider.getTransactionGas(targetCurrnecy, gasPrice);
        });
    }
    sendFeeForFutureTokenTransfer(network, feeProviderSk, addressToBeFunded, targetCurrency, shouldWait, feeAmount) {
        return __awaiter(this, void 0, void 0, function* () {
            const transferFee = yield this.calculateTokenTransferFee(network, targetCurrency);
            const remainingFee = yield this.checkAccountRemainingFundsForFee(network, addressToBeFunded, targetCurrency, transferFee);
            if (remainingFee > 0) {
                const client = this.clientFactory.forNetwork(network);
                // Transfer fee to address
                console.log('Transferring fee to address ', addressToBeFunded, remainingFee, client.feeCurrency());
                const feeTxId = yield client.processPaymentFromPrivateKey(feeProviderSk, addressToBeFunded, client.feeCurrency(), remainingFee);
                if (shouldWait) {
                    const feeTx = yield client.waitForTransaction(feeTxId);
                    if (!feeTx) {
                        throw new Error(`Could not transfer fee to address ${addressToBeFunded}: getting the fee transaction timed out`);
                    }
                    if (feeTx.failed) {
                        throw new Error(`Could not transfer fee to address ${addressToBeFunded}: Fee transaction '${feeTxId}' has failed`);
                    }
                }
                return feeTxId;
            }
        });
    }
    transferToken(network, fromSk, fromAddress, toAddress, currency, amount, requiredFee, shouldWait) {
        return __awaiter(this, void 0, void 0, function* () {
            const remainingFee = yield this.checkAccountRemainingFundsForFee(network, fromAddress, currency, requiredFee);
            ferrum_plumbing_1.ValidationUtils.isTrue(!remainingFee, `Address ${fromAddress} does not have enough funds to cover transaction fee. ${remainingFee} more is required`);
            const client = this.clientFactory.forNetwork(network);
            console.log('Transferring amount to address ', toAddress, amount, currency);
            const finalTxId = yield client.processPaymentFromPrivateKey(fromSk, toAddress, currency, amount);
            if (shouldWait) {
                const finalTx = yield client.waitForTransaction(finalTxId);
                if (!finalTx) {
                    throw new Error(`Could not transfer from address ${fromAddress} to ${toAddress}: getting the transaction timed out.`);
                }
                if (finalTx.failed) {
                    throw new Error(`Could not transfer from address ${fromAddress} to ${toAddress}: the transaction failed.`);
                }
                return finalTx;
            }
            return finalTxId;
        });
    }
    /**
     * TODO: Update to use signer instead of directly using sk
     * Submits a tx and transfer required fees if necessary. Returns all the created transactions.
     * @param fromSk
     */
    sendTokenUsingSk(network, feeProviderSk, fromSk, fromAddress, toAddress, currency, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = this.clientFactory.forNetwork(network);
            const fromBal = (yield client.getBalance(fromAddress, currency)) || 0;
            ferrum_plumbing_1.ValidationUtils.isTrue(fromBal >= amount, `Sender '${fromAddress}' does not have enough balance. Required ${amount}, available: ${fromBal}`);
            const txs = [];
            const requiredFee = yield this.calculateTokenTransferFee(network, currency);
            const feeTx = yield this.sendFeeForFutureTokenTransfer(network, feeProviderSk, fromAddress, currency, true, requiredFee);
            if (feeTx) {
                txs.push(feeTx);
            }
            console.log('Transferring amount to address ', toAddress, amount, currency);
            const tokenTx = yield this.transferToken(network, fromSk, fromAddress, toAddress, currency, amount, requiredFee, true);
            txs.push(tokenTx);
            return txs;
        });
    }
    __name__() { return 'ChainTransactionProcessor'; }
}
exports.ChainTransactionProcessor = ChainTransactionProcessor;
//# sourceMappingURL=ChainTransactionProcessor.js.map