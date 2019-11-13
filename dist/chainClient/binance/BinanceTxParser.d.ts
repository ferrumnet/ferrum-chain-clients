import { SimpleTransferTransaction } from "../types";
import { HexString } from "ferrum-plumbing";
export declare class BinanceTxParser {
    static parseFromHex(hex: HexString, blockTime: number, hash: string): SimpleTransferTransaction | undefined;
    private static parseBnbTrabnsaction;
}
//# sourceMappingURL=BinanceTxParser.d.ts.map