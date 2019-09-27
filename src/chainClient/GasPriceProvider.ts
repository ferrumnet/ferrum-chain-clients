import fetch from "cross-fetch";

export interface EthGasPrice {
    low: number;
    medium: number;
    high: number;
}

export class GasPriceProvider {
    private static GasStationUrl = 'https://ethgasstation.info/json/ethgasAPI.json';
    private static GasTimeout = 30000;
    private lastUpdate = 0;
    private lastPrice: EthGasPrice|undefined;
    constructor() {}

    async getGasPrice(): Promise<EthGasPrice> {
        if (this.lastUpdate < (Date.now() - GasPriceProvider.GasTimeout)) {
            return this.lastPrice!;
        }
        const res = await fetch(GasPriceProvider.GasStationUrl, {});
        if (res.status >= 400) {
            const txt = await res.text();
            throw new Error('Error getting gas price: ' + txt);
        }
        const prices = await res.json();
        this.lastPrice = {
            low: prices['safeLow'],
            medium: prices['average'],
            high: prices['fast'],
        };
        return this.lastPrice;
    }
}
