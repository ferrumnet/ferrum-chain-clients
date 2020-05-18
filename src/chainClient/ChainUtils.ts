import {HexString, Network, sleep, ValidationUtils} from 'ferrum-plumbing';
import {ChainClient, ServerTransaction, ServerTransactionItem, SimpleTransferTransaction, EcSignature} from './types';
// @ts-ignore
import {sign, } from 'hdkey/lib/secp256k1';
import {ecsign} from 'ethereumjs-util';
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
            const res = sign(dataBuffer, skBuffer);
            return {
                r: res.signature.slice(0, 32).toString('hex'),
                s: res.signature.slice(32, 64).toString('hex'),
                v: res.recovery,
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

    static signatureToHex(sig: EcSignature): HexString {
        const i = sig.v + 27 + 4;
        const cBuf = Buffer.alloc(66);
        cBuf.writeInt8(i, 0);
        const r = Buffer.from(sig.r, 'hex');
        const s = Buffer.from(sig.s, 'hex');
        r.copy(cBuf, 1, 0, 32);
        s.copy(cBuf, 33, 0, 32);
        return cBuf.toString('hex');
    }

    static addressesAreEqual(network: Network, a1: string, a2: string): boolean {
        if (!a1 || !a2) {
            return false;
        }
        return ChainUtils.canonicalAddress(network, a1) === ChainUtils.canonicalAddress(network, a2);
    }

    static simpleTransactionToServer(tx: SimpleTransferTransaction): ServerTransaction {
        ValidationUtils.isTrue(tx.fromItems.length !== 0, 'Transaction has no items');
        const items: ServerTransactionItem[] = [];
        const feeItem = {
            address: tx.fromItems[0].address,
            currency: tx.feeCurrency,
            addressType: 'ADDRESS',
            amount: toServerAmount(tx.fee, tx.feeCurrency, tx.feeDecimals || ETH_DECIMALS, true),
            itemType: 'FEE',
        } as ServerTransactionItem;
        items.push(feeItem);
        tx.fromItems.forEach(i => {
            items.push({
                address: i.address,
                currency: i.currency,
                addressType: 'ADDRESS',
                amount: toServerAmount(i.amount, i.currency, i.decimals || ETH_DECIMALS, true),
            } as ServerTransactionItem);
        });
        tx.toItems.forEach(i => {
            items.push({
                address: i.address,
                currency: i.currency,
                addressType: 'ADDRESS',
                amount: toServerAmount(i.amount, i.currency, i.decimals || ETH_DECIMALS),
            } as ServerTransactionItem);
        });
        return {
            id: tx.id,
            network: tx.network,
            transactionType: 'CHAIN_TRANSACTION',
            transactionId: tx.id,
            confirmationTime: tx.confirmationTime,
            creationTime: tx.creationTime,
            fee: toServerAmount(tx.fee, tx.feeCurrency, tx.feeDecimals || ETH_DECIMALS),
            feeCurrency: tx.feeCurrency,
            isConfirmed: tx.confirmed,
            failed: tx.failed,
            version: 0,
            items,
        } as ServerTransaction;
    }

    static canonicalAddress(network: Network, address: string) {
        // TODO: Turn address to byte and back instead of lowercase.
        if (['ETHEREUM', 'RINKEBY', 'BINANCE', 'BINANCE_TESTNET'].indexOf(network) >= 0) {
            return address.toLowerCase();
        } else {
            return address;
        }
    }

    /**
     *  Converts to bigint, similar to fromWei
     */
    static toDecimalStr(amount: any, decimals: number): string {
        const bn = new BN(amount).toString();
        if (bn.length <= decimals) {
            const zeros = decimals - bn.length;
            return '0.' + '0'.repeat(zeros) + bn;
        }
        return bn.substr(0, bn.length - decimals) + '.' + (bn.substr(bn.length - decimals) || '0');
    }

    /**
     * Converts a decimal to bigint, similar to toWei
     */
    static toBigIntStr(amount: string|number, decimals: number): string {
        amount = typeof amount === 'number' ? amount.toFixed(decimals) : amount;
        let [intPart, deciPart] = amount.split('.',2);
        deciPart = deciPart || '';
        if (deciPart.length < decimals) {
            deciPart = deciPart + '0'.repeat(decimals - deciPart.length);
        } else {
            deciPart = deciPart.substr(0, decimals);
        }
        return intPart + deciPart;
    }

    static tokenPart(cur: string) {
        const pars = cur.split(':');
        ValidationUtils.isTrue(pars.length == 2, 'Invalid currency ' + cur);
        return pars[1];
    }
}

export async function waitForTx(
    client: ChainClient,
    transactionId: string,
    waitTimeout: number,
    fetchTimeout: number,
    justWaitForPending: boolean = false,
    ) {
    const time = Date.now();
    while (true) {
        const tx = await client.getTransactionById(transactionId, true);
        if (!tx && (Date.now() - time) > waitTimeout) {
            return undefined;
        }
        if (tx && justWaitForPending) {
            return tx;
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

function toServerAmount(amount: string, currency: string, decimals: number, negate: boolean = false) {
    ValidationUtils.isTrue(decimals !== undefined, 'decimals must be provided for currency ' + currency);
    const bn = ChainUtils.toBigIntStr(amount, decimals);
    return negate ? new BN(bn).neg().toString() : bn;
}

export function normalizeBnbAmount(amount: string): string {
    return ChainUtils.toDecimalStr(amount, BINANCE_DECIMALS);
}

export const BINANCE_DECIMALS = 8;
export const ETH_DECIMALS = 18;
