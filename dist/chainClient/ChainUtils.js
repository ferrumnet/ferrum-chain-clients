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
class ChainUtils {
    static addressesAreEqual(network, a1, a2) {
        if (!a1 || !a2) {
            return false;
        }
        if (network === 'ETHEREUM' || network === 'BINANCE') {
            return a1.toLowerCase() === a2.toLowerCase();
        }
        else {
            return a1 === a2;
        }
    }
    static simpleTransactionToServer(tx) {
        const item1 = {
            address: tx.from.address,
            currency: tx.from.currency,
            addressType: 'ADDRESS',
            amount: toServerAmount(-1 * tx.from.amount, tx.from.currency, tx.from.decimals),
        };
        const item2 = {
            address: tx.to.address,
            currency: tx.to.currency,
            addressType: 'ADDRESS',
            amount: toServerAmount(tx.to.amount, tx.to.currency, tx.to.decimals),
        };
        return {
            id: tx.id,
            transactionType: 'CHAIN_TRANSACTION',
            transactionId: tx.id,
            confirmationTime: tx.confirmationTime,
            creationTime: 0,
            externalFee: toServerAmount(tx.fee, tx.feeCurrency, tx.feeDecimals),
            isConfirmed: tx.confirmed,
            isFailed: tx.failed,
            version: 0,
            items: [item1, item2],
        };
    }
    static canonicalAddress(network, address) {
        // TODO: Turn address to byte and back instead of lowercase.
        if (network === 'ETHEREUM' || network === 'BINANCE') {
            return address.toLowerCase();
        }
        else {
            return address;
        }
    }
    static bufferToHex(buffer) {
        return Array
            .from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");
    }
}
exports.ChainUtils = ChainUtils;
ChainUtils.DEFAULT_PENDING_TRANSACTION_SHOW_TIMEOUT = 60000;
ChainUtils.TX_FETCH_TIMEOUT = 1000;
ChainUtils.TX_MAXIMUM_WAIT_TIMEOUT = 3600 * 1000;
function waitForTx(client, transactionId, waitTimeout, fetchTimeout) {
    return __awaiter(this, void 0, void 0, function* () {
        const time = Date.now();
        while (true) {
            const tx = yield client.getTransactionById(transactionId);
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
            yield ferrum_plumbing_1.sleep(fetchTimeout);
        }
    });
}
exports.waitForTx = waitForTx;
function toServerAmount(amount, currency, decimals) {
    if (currency === 'ETH') {
        return ethToGwei(amount);
    }
    ferrum_plumbing_1.ValidationUtils.isTrue(!currency || !!decimals, 'decimals must be provided for currency ' + currency);
    return (amount * (Math.pow(10, (decimals || 0)))).toFixed(12);
}
function ethToGwei(eth) {
    return web3_1.default.utils.toWei(eth.toFixed(18), 'gwei');
}
function normalizeBnbAmount(amount) {
    return Number(amount) / (Math.pow(10, exports.BINANCE_DECIMALS));
}
exports.normalizeBnbAmount = normalizeBnbAmount;
exports.BINANCE_DECIMALS = 8;
//# sourceMappingURL=ChainUtils.js.map