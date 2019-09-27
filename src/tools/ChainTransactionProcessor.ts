import {Injectable, Network, ValidationUtils} from 'ferrum-plumbing';
import {ChainClientFactory} from '../chainClient/ChainClientFactory';
import Web3 from 'web3';
import BN from 'bn.js';

const MIN_FEE = {
    'ETHEREUM': Web3.utils.toWei(Web3.utils.toWei(new BN(1), 'gwei'), 'ether').toNumber(),
    'BINANCE': 0.000375,
    'BITCOIN': 0, // TODO: Support
    'FERRUM': 0, // TODO: Support
};

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
                           feeProviderSk: ArrayBuffer,
                           fromSk: ArrayBuffer,
                           fromAddress: string,
                           toAddress: string,
                           currency: string,
                           amount: number) {
        const client = this.clientFactory.forNetwork(network);
        const fromBal = await client.getBalance(fromAddress, currency);
        ValidationUtils.isTrue(fromBal > amount, `Sender '${fromAddress}' does not have enough balance. Required ${amount}, available: ${fromBal}`)
        const requiredFee = MIN_FEE[network]; // TODO: Use a fee service
        const feeBal = await client.getBalance(fromAddress, client.feeCurrency());
        const txs = [];
        if (feeBal < requiredFee) {
            // Transfer fee to address
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
