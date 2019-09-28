import {EthereumGasPriceProvider} from "./GasPriceProvider";

test('Can get gas price ', async () => {
    const gpp = new EthereumGasPriceProvider();
    const price = await gpp.getGasPrice()
    console.log(price);
    expect(price.high).toBeGreaterThan(0);
    expect(price.high).toBeLessThan(1);
    expect(price.low).toBeGreaterThan(0);
    expect(price.low).toBeLessThan(1);
    expect(price.low).toBeGreaterThan(0);
});
