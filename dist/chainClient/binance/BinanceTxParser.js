"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const bnb_tx_decoder_1 = require("bnb-tx-decoder");
const ChainUtils_1 = require("../ChainUtils");
// @ts-ignore
const javascript_sdk_1 = __importDefault(require("@binance-chain/javascript-sdk"));
function parseSingleItem(item) {
    const coin = item['coins'][0];
    const address = javascript_sdk_1.default.crypto.encodeAddress(item['address']);
    return {
        address,
        currency: coin['denom'],
        amount: ChainUtils_1.normalizeBnbAmount(coin['amount']),
        decimals: ChainUtils_1.BINANCE_DECIMALS,
    };
}
const txParserByType = {
    'MsgSend': (tx) => {
        const from = tx['inputs'] && tx['inputs'].length ? parseSingleItem(tx['inputs'][0]) : undefined;
        const to = tx['outputs'] && tx['outputs'].length ? parseSingleItem(tx['outputs'][0]) : undefined;
        return {
            from,
            to,
        };
    }
};
class BinanceTxParser {
    static parseFromHex(hex, blockTime, hash) {
        const decoded = bnb_tx_decoder_1.decodeBnbRawTx(hex);
        return decoded ? BinanceTxParser.parseBnbTrabnsaction(decoded, blockTime, hash) : undefined;
    }
    static parseBnbTrabnsaction(tx, blockTime, hash) {
        const memo = tx['memo'];
        const msgs = tx['msg'];
        if (!msgs || !msgs.length) {
            return undefined;
        }
        const msg = msgs[0];
        const msgType = msg['msgType'];
        const parser = txParserByType[msgType];
        if (!parser) {
            return undefined;
        }
        const res = parser(msg);
        res.memo = memo;
        res.network = 'BINANCE';
        res.confirmed = true;
        res.confirmationTime = blockTime;
        res.id = hash;
        return res;
    }
}
exports.BinanceTxParser = BinanceTxParser;
//# sourceMappingURL=BinanceTxParser.js.map