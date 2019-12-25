import {HexString, Network, sleep, ValidationUtils} from 'ferrum-plumbing';
import {ChainClient, ServerTransaction, ServerTransactionItem, SimpleTransferTransaction, EcSignature} from './types';
import Web3 from 'web3';
import ecc from 'tiny-secp256k1';
// @ts-ignore
import {ecsign} from 'ethereumjs-utils';
import BN from "bn.js";

export class ChainUtils {
    static readonly DEFAULT_PENDING_TRANSACTION_SHOW_TIMEOUT = 60000;
    static readonly TX_FETCH_TIMEOUT = 1000;
    static readonly TX_MAXIMUM_WAIT_TIMEOUT = 3600 * 1000;

    /**
     * Signs data
     * @return Formatter
     */
    static sign(data: HexString, sk: HexString, forceLow: boolean): EcSignature {
        const dataBuffer = Buffer.from(data, 'hex');
        const skBuffer = Buffer.from(sk, 'hex');
        if (forceLow) {
            const res = ecc.sign(dataBuffer, skBuffer);
            return {
                r: res.slice(0, 32).toString('hex'),
                s: res.slice(32, 64).toString('hex'),
                v: 0,
            }
        } else {
            const sig = ecsign(dataBuffer, skBuffer);
            return {
                r: sig.r.toString('hex'),
                s: sig.s.toString('hex'),
                v: sig.v,
            }
        }
    }

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

    static simpleTransactionToServer(tx: SimpleTransferTransaction): ServerTransaction {
        const feeItem = {
            address: tx.from.address,
            currency: tx.feeCurrency,
            addressType: 'ADDRESS',
            amount: toServerAmount(-1 * tx.fee, tx.feeCurrency, tx.feeDecimals),
        } as ServerTransactionItem;
        const item1 = {
            address: tx.from.address,
            currency: tx.from.currency,
            addressType: 'ADDRESS',
            amount: toServerAmount(-1 * tx.from.amount, tx.from.currency, tx.from.decimals),
        } as ServerTransactionItem;
        const item2 = {
            address: tx.to.address,
            currency: tx.to.currency,
            addressType: 'ADDRESS',
            amount: toServerAmount(tx.to.amount, tx.to.currency, tx.to.decimals),
        } as ServerTransactionItem;
        return {
            id: tx.id,
            network: tx.network,
            transactionType: 'CHAIN_TRANSACTION',
            transactionId: tx.id,
            confirmationTime: tx.confirmationTime,
            creationTime: tx.creationTime,
            fee: toServerAmount(tx.fee, tx.feeCurrency, tx.feeDecimals),
            feeCurrency: tx.feeCurrency,
            isConfirmed: tx.confirmed,
            isFailed: tx.failed,
            version: 0,
            items: [feeItem, item1, item2],
        } as ServerTransaction;
    }

    static canonicalAddress(network: Network, address: string) {
        // TODO: Turn address to byte and back instead of lowercase.
        if (network === 'ETHEREUM' || network === 'BINANCE') {
            return address.toLowerCase();
        } else {
            return address;
        }
    }

    static bufferToHex (buffer: ArrayBuffer) {
        return Array
            .from (new Uint8Array (buffer))
            .map (b => b.toString (16).padStart (2, "0"))
            .join ("");
    }

    static toDecimalStr(amount: any, decimals: number): string {
        const bn = new BN(amount).toString();
        if (bn.length <= decimals) {
            const zeros = decimals - bn.length;
            return '0.' + '0'.repeat(zeros) + bn;
        }
        return bn.substr(0, bn.length - decimals) + '.' + (bn.substr(bn.length - decimals) || '0');
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
        console.log('Waiting for transaction ', transactionId, !tx);
        await sleep(fetchTimeout);
    }
}

function toServerAmount(amount: number, currency: string, decimals?: number) {
    if (currency === 'ETH') {
        return ethToGwei(amount);
    }
    ValidationUtils.isTrue(decimals !== undefined, 'decimals must be provided for currency ' + currency);
    return (amount * (10 ** (decimals || 0))).toFixed(12);
}

function ethToGwei(eth: number): string {
    return Web3.utils.toWei(eth.toFixed(9), 'gwei'); // Kudi server uses gwei as the smaller unit
}

export function normalizeBnbAmount(amount: string): number {
    return Number(amount) / (10 ** BINANCE_DECIMALS);
}

export const BINANCE_DECIMALS = 8;
