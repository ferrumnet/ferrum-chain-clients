import {HexString, Injectable, Network, ValidationUtils} from 'ferrum-plumbing';
import {ChainClientFactory} from '../chainClient/ChainClientFactory';
import {SimpleTransferTransaction} from '../chainClient/types';

export class ChainTransactionProcessor implements Injectable {
    constructor(
        private clientFactory: ChainClientFactory,
    ) {
    }

    async checkAccountHasFundsForFee(network: Network, address: string, targetCurrency: string) {
        const client = this.clientFactory.forNetwork(network);
        const gasPriceProvider = this.clientFactory.gasPriceProvider(network);
        const gasPrice = (await gasPriceProvider.getGasPrice()).low;
        const requiredFee = gasPriceProvider.getTransactionGas(targetCurrency, gasPrice);
        const feeBal = await client.getBalance(address, client.feeCurrency()) || 0;
        return feeBal >= requiredFee;
    }

    async sendFeeForFutureTokenTransfer(network: Network,
                          feeProviderSk: HexString,
                          addressToBeFunded: string,
                          targetCurrency: string,
                          shouldWait: boolean,
                          ): Promise<SimpleTransferTransaction | string | undefined> {
        const hasFee = await this.checkAccountHasFundsForFee(network, addressToBeFunded, targetCurrency);
        if (!hasFee) {
            const client = this.clientFactory.forNetwork(network);
            const gasPriceProvider = this.clientFactory.gasPriceProvider(network);
            const gasPrice = (await gasPriceProvider.getGasPrice()).low;
            const requiredFee = gasPriceProvider.getTransactionGas(targetCurrency, gasPrice);
            // Transfer fee to address
            console.log('Transferring fee to address ', addressToBeFunded, requiredFee, client.feeCurrency());
            const feeTxId = await client.processPaymentFromPrivateKey(feeProviderSk,
                addressToBeFunded, client.feeCurrency(), requiredFee);
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
                        amount: number,
                        shouldWait: boolean): Promise<SimpleTransferTransaction|string> {
        const hasFee = await this.checkAccountHasFundsForFee(network, fromAddress, currency);
        ValidationUtils.isTrue(hasFee,
            `Address ${fromAddress} does not have enough funds to cover transaction fee`);
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
                           amount: number) {
        const client = this.clientFactory.forNetwork(network);
        const fromBal = await client.getBalance(fromAddress, currency) || 0;
        ValidationUtils.isTrue(fromBal >= amount, `Sender '${fromAddress}' does not have enough balance. Required ${amount}, available: ${fromBal}`)
        const txs = [];
        const feeTx = await this.sendFeeForFutureTokenTransfer(network, feeProviderSk, fromAddress, currency, true);
        if (feeTx) {
            txs.push(feeTx);
        }
        console.log('Transferring amount to address ', toAddress, amount, currency);
        const tokenTx = await this.transferToken(network, fromSk, fromAddress, toAddress, currency, amount, true);
        txs.push(tokenTx);
        return txs;
    }

    __name__(): string { return 'ChainTransactionProcessor'; }
}
