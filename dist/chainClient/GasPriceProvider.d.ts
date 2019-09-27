export interface EthGasPrice {
    low: number;
    medium: number;
    high: number;
}
export declare class GasPriceProvider {
    private static GasStationUrl;
    private static GasTimeout;
    private lastUpdate;
    private lastPrice;
    constructor();
    getGasPrice(): Promise<EthGasPrice>;
}
//# sourceMappingURL=GasPriceProvider.d.ts.map