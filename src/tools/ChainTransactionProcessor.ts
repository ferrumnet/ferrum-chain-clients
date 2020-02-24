import {HexString, Injectable, Network, ValidationUtils} from 'ferrum-plumbing';
import {ChainClientFactory} from '../chainClient/ChainClientFactory';
import {SimpleTransferTransaction} from '../chainClient/types';
import BN from 'bn.js';
import {ChainUtils} from "../chainClient/ChainUtils";

export class ChainTransactionProcessor implements Injectable {
    constructor(
        private clientFactory: ChainClientFactory,
    ) {
    }

    async checkAccountRemainingFundsForFee(network: Network, address: string, targetCurrency: string, requiredFee: string) {
        const client = this.clientFactory.forNetwork(network);
        const feeBal = await client.getBalance(address, client.feeCurrency()) || '0';
        const req = new BN(ChainUtils.toBigIntStr(requiredFee, client.feeDecimals()));
        const bal = new BN(ChainUtils.toBigIntStr(feeBal, client.feeDecimals()));
        const rem = req.sub(bal);
        return rem.isNeg() ? '0' : ChainUtils.toDecimalStr(rem.toString(), client.feeDecimals());
    }

    async calculateTokenTransferFee(network: Network, targetCurrnecy: string) {
        const gasPriceProvider = this.clientFactory.gasPriceProvider(network);
        const gasPrice = (await gasPriceProvider.getGasPrice()).low;
        return  gasPriceProvider.getTransactionGas(targetCurrnecy, gasPrice);
    }

    async sendFeeForFutureTokenTransfer (
        network: Network,
        feeProviderSk: HexString,
        addressToBeFunded: string,
        targetCurrency: string,
        shouldWait: boolean,
        feeAmount: string): Promise<SimpleTransferTransaction | string | undefined> {
        const transferFee = await this.calculateTokenTransferFee(network, targetCurrency);
        const remainingFee = await this.checkAccountRemainingFundsForFee(
            network, addressToBeFunded, targetCurrency, transferFee);
        if (remainingFee !== '0') {
            const client = this.clientFactory.forNetwork(network);
            // Transfer fee to address
            console.log('Transferring fee to address ', addressToBeFunded, remainingFee, client.feeCurrency());
            const feeTxId = await client.processPaymentFromPrivateKey(feeProviderSk,
                addressToBeFunded, client.feeCurrency(), remainingFee);
            if (shouldWait) {
                const feeTx = await client.waitForTransaction(feeTxId);
                if (!feeTx) {
                    throw new Error(`Could not transfer fee to address ${addressToBeFunded}: getting the fee transaction timed out`);
                }
                if (feeTx!.failed) {
                    throw new Error(`Could not transfer fee to address ${addressToBeFunded}: Fee transaction '${feeTxId}' has failed`);
                }
            }
            return feeTxId;
        }
    }

    async transferToken(network: Network,
                        fromSk: HexString,
                        fromAddress: string,
                        toAddress: string,
                        currency: string,
                        amount: string,
                        requiredFee: string,
                        shouldWait: boolean): Promise<SimpleTransferTransaction|string> {
        const remainingFee = await this.checkAccountRemainingFundsForFee(network, fromAddress, currency, requiredFee);
        ValidationUtils.isTrue(!remainingFee,
            `Address ${fromAddress} does not have enough funds to cover transaction fee. ${remainingFee} more is required`);
        const client = this.clientFactory.forNetwork(network);
        console.log('Transferring amount to address ', toAddress, amount, currency);
        const finalTxId = await client.processPaymentFromPrivateKey(fromSk, toAddress, currency, amount);
        if (shouldWait) {
            const finalTx = await client.waitForTransaction(finalTxId);
            if (!finalTx) {
                throw new Error(`Could not transfer from address ${fromAddress} to ${toAddress}: getting the transaction timed out.`);
            }
            if (finalTx!.failed) {
                throw new Error(`Could not transfer from address ${fromAddress} to ${toAddress}: the transaction failed.`);
            }
            return finalTx;
        }
        return finalTxId;
    }

    /**
     * TODO: Update to use signer instead of directly using sk
     * Submits a tx and transfer required fees if necessary. Returns all the created transactions.
     * @param fromSk
     */
    async sendTokenUsingSk(network: Network,
                           feeProviderSk: HexString,
                           fromSk: HexString,
                           fromAddress: string,
                           toAddress: string,
                           currency: string,
                           amount: string) {
        const client = this.clientFactory.forNetwork(network);
        const fromBal = await client.getBalance(fromAddress, currency) || 0;
        ValidationUtils.isTrue(fromBal >= amount, `Sender '${fromAddress}' does not have enough balance. Required ${amount}, available: ${fromBal}`)
        const txs = [];
        const requiredFee = await this.calculateTokenTransferFee(network, currency);
        const feeTx = await this.sendFeeForFutureTokenTransfer(
            network, feeProviderSk, fromAddress, currency, true, requiredFee);
        if (feeTx) {
            txs.push(feeTx);
        }
        console.log('Transferring amount to address ', toAddress, amount, currency);
        const tokenTx = await this.transferToken(
            network, fromSk, fromAddress, toAddress, currency, amount, requiredFee, true);
        txs.push(tokenTx);
        return txs;
    }

    __name__(): string { return 'ChainTransactionProcessor'; }
}
