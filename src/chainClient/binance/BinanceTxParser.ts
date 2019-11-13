import {SimpleTransferTransaction} from "../types";
import {HexString} from "ferrum-plumbing";
// @ts-ignore
import {decodeBnbRawTx} from 'bnb-tx-decoder';
import {BINANCE_DECIMALS, normalizeBnbAmount} from "../ChainUtils";
// @ts-ignore
import BnbApiClient from '@binance-chain/javascript-sdk';

function parseSingleItem(item: any) {
    const coin = item['coins'][0];
    const address = BnbApiClient.crypto.encodeAddress(item['address']);
    return {
        address,
        currency: coin['denom'],
        amount: normalizeBnbAmount(coin['amount']),
        decimals: BINANCE_DECIMALS,
    };
}

const txParserByType: { [k: string]: (tx: any) => SimpleTransferTransaction } = {
  'MsgSend' : (tx: any) => {
      const from = tx['inputs'] && tx['inputs'].length ? parseSingleItem(tx['inputs'][0]) : undefined;
      const to = tx['outputs'] && tx['outputs'].length ? parseSingleItem(tx['outputs'][0]) : undefined;
      return {
          from,
          to,
      } as SimpleTransferTransaction;
  }
};

export class BinanceTxParser {
    public static parseFromHex(hex: HexString, blockTime: number, hash: string): SimpleTransferTransaction | undefined {
        const decoded = decodeBnbRawTx(hex);
        return decoded ? BinanceTxParser.parseBnbTrabnsaction(decoded, blockTime, hash) : undefined;
    }

    private static parseBnbTrabnsaction(tx: any, blockTime: number, hash: string): SimpleTransferTransaction | undefined {
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