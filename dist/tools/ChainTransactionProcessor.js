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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ferrum_plumbing_1 = require("ferrum-plumbing");
const web3_1 = __importDefault(require("web3"));
const bn_js_1 = __importDefault(require("bn.js"));
const MIN_FEE = {
    'ETHEREUM': web3_1.default.utils.toWei(web3_1.default.utils.toWei(new bn_js_1.default(1), 'gwei'), 'ether').toNumber(),
    'BINANCE': 0.000375,
    'BITCOIN': 0,
    'FERRUM': 0,
};
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
            ferrum_plumbing_1.ValidationUtils.isTrue(fromBal > amount, `Sender '${fromAddress}' does not have enough balance. Required ${amount}, available: ${fromBal}`);
            const requiredFee = MIN_FEE[network]; // TODO: Use a fee service
            const feeBal = yield client.getBalance(fromAddress, client.feeCurrency());
            const txs = [];
            if (feeBal < requiredFee) {
                // Transfer fee to address
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