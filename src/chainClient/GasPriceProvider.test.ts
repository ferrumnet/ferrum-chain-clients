import {GasPriceProvider} from "./GasPriceProvider";

test('Can get gas price ', async () => {
    const gpp = new GasPriceProvider();
    const price = await gpp.getGasPrice()
    console.log(price);
    expect(price.high).toBeGreaterThan(0);
    expect(price.low).toBeGreaterThan(0);
    expect(price.low).toBeGreaterThan(0);
});
