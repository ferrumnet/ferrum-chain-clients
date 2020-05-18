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
// @ts-ignore
const secp256k1_1 = require("hdkey/lib/secp256k1");
const ethereumjs_util_1 = require("ethereumjs-util");
const bn_js_1 = __importDefault(require("bn.js"));
class ChainUtils {
    /**
     * Signs data
     * @return Formatter
     */
    static sign(data, sk, forceLow) {
        const dataBuffer = Buffer.from(data, 'hex');
        const skBuffer = Buffer.from(sk, 'hex');
        if (forceLow) {
            const res = secp256k1_1.sign(dataBuffer, skBuffer);
            return {
                r: res.signature.slice(0, 32).toString('hex'),
                s: res.signature.slice(32, 64).toString('hex'),
                v: res.recovery,
            };
        }
        else {
            const sig = ethereumjs_util_1.ecsign(dataBuffer, skBuffer);
            return {
                r: sig.r.toString('hex'),
                s: sig.s.toString('hex'),
                v: sig.v,
            };
        }
    }
    static signatureToHex(sig) {
        const i = sig.v + 27 + 4;
        const cBuf = Buffer.alloc(66);
        cBuf.writeInt8(i, 0);
        const r = Buffer.from(sig.r, 'hex');
        const s = Buffer.from(sig.s, 'hex');
        r.copy(cBuf, 1, 0, 32);
        s.copy(cBuf, 33, 0, 32);
        return cBuf.toString('hex');
    }
    static addressesAreEqual(network, a1, a2) {
        if (!a1 || !a2) {
            return false;
        }
        return ChainUtils.canonicalAddress(network, a1) === ChainUtils.canonicalAddress(network, a2);
    }
    static simpleTransactionToServer(tx) {
        ferrum_plumbing_1.ValidationUtils.isTrue(tx.fromItems.length !== 0, 'Transaction has no items');
        const items = [];
        const feeItem = {
            address: tx.fromItems[0].address,
            currency: tx.feeCurrency,
            addressType: 'ADDRESS',
            amount: toServerAmount(tx.fee, tx.feeCurrency, tx.feeDecimals || exports.ETH_DECIMALS, true),
            itemType: 'FEE',
        };
        items.push(feeItem);
        tx.fromItems.forEach(i => {
            items.push({
                address: i.address,
                currency: i.currency,
                addressType: 'ADDRESS',
                amount: toServerAmount(i.amount, i.currency, i.decimals || exports.ETH_DECIMALS, true),
            });
        });
        tx.toItems.forEach(i => {
            items.push({
                address: i.address,
                currency: i.currency,
                addressType: 'ADDRESS',
                amount: toServerAmount(i.amount, i.currency, i.decimals || exports.ETH_DECIMALS),
            });
        });
        return {
            id: tx.id,
            network: tx.network,
            transactionType: 'CHAIN_TRANSACTION',
            transactionId: tx.id,
            confirmationTime: tx.confirmationTime,
            creationTime: tx.creationTime,
            fee: toServerAmount(tx.fee, tx.feeCurrency, tx.feeDecimals || exports.ETH_DECIMALS),
            feeCurrency: tx.feeCurrency,
            isConfirmed: tx.confirmed,
            failed: tx.failed,
            version: 0,
            items,
        };
    }
    static canonicalAddress(network, address) {
        // TODO: Turn address to byte and back instead of lowercase.
        if (['ETHEREUM', 'RINKEBY', 'BINANCE', 'BINANCE_TESTNET'].indexOf(network) >= 0) {
            return address.toLowerCase();
        }
        else {
            return address;
        }
    }
    /**
     *  Converts to bigint, similar to fromWei
     */
    static toDecimalStr(amount, decimals) {
        const bn = new bn_js_1.default(amount).toString();
        if (bn.length <= decimals) {
            const zeros = decimals - bn.length;
            return '0.' + '0'.repeat(zeros) + bn;
        }
        return bn.substr(0, bn.length - decimals) + '.' + (bn.substr(bn.length - decimals) || '0');
    }
    /**
     * Converts a decimal to bigint, similar to toWei
     */
    static toBigIntStr(amount, decimals) {
        amount = typeof amount === 'number' ? amount.toFixed(decimals) : amount;
        let [intPart, deciPart] = amount.split('.', 2);
        deciPart = deciPart || '';
        if (deciPart.length < decimals) {
            deciPart = deciPart + '0'.repeat(decimals - deciPart.length);
        }
        else {
            deciPart = deciPart.substr(0, decimals);
        }
        return intPart + deciPart;
    }
    static tokenPart(cur) {
        const pars = cur.split(':');
        ferrum_plumbing_1.ValidationUtils.isTrue(pars.length == 2, 'Invalid currency ' + cur);
        return pars[1];
    }
}
exports.ChainUtils = ChainUtils;
ChainUtils.DEFAULT_PENDING_TRANSACTION_SHOW_TIMEOUT = 60000;
ChainUtils.TX_FETCH_TIMEOUT = 1000;
ChainUtils.TX_MAXIMUM_WAIT_TIMEOUT = 3600 * 1000;
function waitForTx(client, transactionId, waitTimeout, fetchTimeout, justWaitForPending = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const time = Date.now();
        while (true) {
            const tx = yield client.getTransactionById(transactionId, true);
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
            yield ferrum_plumbing_1.sleep(fetchTimeout);
        }
    });
}
exports.waitForTx = waitForTx;
function toServerAmount(amount, currency, decimals, negate = false) {
    ferrum_plumbing_1.ValidationUtils.isTrue(decimals !== undefined, 'decimals must be provided for currency ' + currency);
    const bn = ChainUtils.toBigIntStr(amount, decimals);
    return negate ? new bn_js_1.default(bn).neg().toString() : bn;
}
function normalizeBnbAmount(amount) {
    return ChainUtils.toDecimalStr(amount, exports.BINANCE_DECIMALS);
}
exports.normalizeBnbAmount = normalizeBnbAmount;
exports.BINANCE_DECIMALS = 8;
exports.ETH_DECIMALS = 18;
//# sourceMappingURL=ChainUtils.js.map