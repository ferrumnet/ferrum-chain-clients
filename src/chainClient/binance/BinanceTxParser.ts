import {SimpleTransferTransaction} from "../types";
import {HexString, Network} from "ferrum-plumbing";
// @ts-ignore
import {decodeBnbRawTx} from 'bnb-tx-decoder';
import {BINANCE_DECIMALS, normalizeBnbAmount} from "../ChainUtils";
// @ts-ignore
import BnbApiClient from '@binance-chain/javascript-sdk';

function parseSingleItem(network: string, item: any) {
    const coin = item['coins'][0];
    const address = BnbApiClient.crypto.encodeAddress(item['address']);
    return {
        address,
        currency: network + ':' + coin['denom'],
        amount: normalizeBnbAmount(coin['amount']),
        decimals: BINANCE_DECIMALS,
    };
}

const txParserByType: { [k: string]: (network: string, tx: any) => SimpleTransferTransaction } = {
  'MsgSend' : (network, tx) => {
      const from = tx['inputs'] && tx['inputs'].length ? parseSingleItem(network, tx['inputs'][0]) : undefined;
      const to = tx['outputs'] && tx['outputs'].length ? parseSingleItem(network, tx['outputs'][0]) : undefined;
      return {
          fromItems: [from],
          toItems: [to],
          singleItem: true,
      } as SimpleTransferTransaction;
  }
};

export class BinanceTxParser {
    public static parseFromHex(network: string, feeCurrency: string, hex: HexString, blockTime: number, hash: string): SimpleTransferTransaction | undefined {
        const decoded = decodeBnbRawTx(hex);
        return decoded ? BinanceTxParser.parseBnbTrabnsaction(network, feeCurrency, decoded, blockTime, hash) : undefined;
    }

    private static parseBnbTrabnsaction(network: string, feeCurrency: string, tx: any, blockTime: number, hash: string): SimpleTransferTransaction | undefined {
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
        const res = parser(network, msg);
        res.memo = memo;
        res.network = network as Network;
        res.feeCurrency = feeCurrency;
        res.confirmed = true;
        res.confirmationTime = blockTime;
        res.creationTime = blockTime;
        res.id = hash;
        return res;
    }
}