import {Network, sleep} from 'ferrum-plumbing';
import {ChainClient} from './types';

export class ChainUtils {
    static readonly DEFAULT_PENDING_TRANSACTION_SHOW_TIMEOUT = 20000;
    static readonly TX_FETCH_TIMEOUT = 1000;
    static readonly TX_MAXIMUM_WAIT_TIMEOUT = 3600 * 1000;
    static addressesAreEqual(network: Network, a1: string, a2: string): boolean {
        if (!a1 || !a2) {
            return false;
        }
        if (network === 'ETHEREUM' || network === 'BINANCE') {
            return a1.toLowerCase() === a2.toLowerCase();
        } else {
            return a1 === a2;
        }
    }

    static canonicalAddress(network: Network, address: string) {
        // TODO: Turn address to byte and back instead of lowercase.
        if (network === 'ETHEREUM' || network === 'BINANCE') {
            return address.toLowerCase();
        } else {
            return address;
        }
    }
}

export async function waitForTx(client: ChainClient, transactionId: string, waitTimeout: number, fetchTimeout: number) {
    const time = Date.now();
    while (true) {
        const tx = await client.getTransactionById(transactionId);
        if (!tx && (Date.now() - time) > waitTimeout) {
            return undefined;
        }
        if (tx && (tx.confirmed || tx.failed)) {
            return tx;
        }
        if ((Date.now() - time) > ChainUtils.TX_MAXIMUM_WAIT_TIMEOUT) {
            throw new Error(`Timed out waiting for transaction ${transactionId} to be either approved to failed`);
        }
        await sleep(fetchTimeout);
    }
}
