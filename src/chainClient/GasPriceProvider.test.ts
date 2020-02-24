import {EthereumGasPriceProvider} from "./GasPriceProvider";

test('Can get gas price ', async () => {
    const gpp = new EthereumGasPriceProvider();
    const price = await gpp.getGasPrice()
    console.log(price);
    expect(Number(price.high)).toBeGreaterThan(0);
    expect(Number(price.high)).toBeLessThan(1);
    expect(Number(price.low)).toBeGreaterThan(0);
    expect(Number(price.low)).toBeLessThan(1);
    expect(Number(price.low)).toBeGreaterThan(0);
});
