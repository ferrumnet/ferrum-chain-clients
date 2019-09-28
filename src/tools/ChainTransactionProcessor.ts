import {HexString, Injectable, Network, ValidationUtils} from 'ferrum-plumbing';
import {ChainClientFactory} from '../chainClient/ChainClientFactory';

export class ChainTransactionProcessor implements Injectable {
    constructor(
        private clientFactory: ChainClientFactory,
    ) {
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
        const gasPriceProvider = this.clientFactory.gasPriceProvider(network);
        const gasPrice = (await gasPriceProvider.getGasPrice()).low;
        const requiredFee = gasPriceProvider.getTransactionGas(currency, gasPrice);
        const feeBal = await client.getBalance(fromAddress, client.feeCurrency()) || 0;
        const txs = [];
        if (feeBal < requiredFee) {
            // Transfer fee to address
            console.log('Transferring fee to address ', toAddress, requiredFee, client.feeCurrency());
            const feeTxId = await client.processPaymentFromPrivateKey(feeProviderSk, fromAddress, client.feeCurrency(), requiredFee);
            const feeTx = await client.waitForTransaction(feeTxId);
            if (!feeTx) {
                throw new Error(`Could not transfer fee to address ${fromAddress}: getting the fee transaction timed out`);
            }
            if (feeTx!.failed) {
                throw new Error(`Could not transfer fee to address ${fromAddress}: Fee transaction '${feeTxId}' has failed`);
            }
            txs.push(feeTx);
        }
        console.log('Transferring amount to address ', toAddress, amount, currency);
        const finalTxId = await client.processPaymentFromPrivateKey(fromSk, toAddress, currency, amount);
        const finalTx = await client.waitForTransaction(finalTxId);
        if (!finalTx) {
            throw new Error(`Could not transfer from address ${fromAddress} to ${toAddress}: getting the transaction timed out.` +
            txs.length ? `Note that there was a successful fee transaction ${txs[0].id}` : ``);
        }
        if (finalTx!.failed) {
            throw new Error(`Could not transfer from address ${fromAddress} to ${toAddress}: the transaction failed.` +
            txs.length ? `Note that there was a successful fee transaction ${txs[0].id}` : ``);
        }
        txs.push(finalTx);
        return txs;
    }

    __name__(): string { return 'ChainTransactionProcessor'; }
}
