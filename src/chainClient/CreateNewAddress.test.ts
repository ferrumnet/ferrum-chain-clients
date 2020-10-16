import {BinanceChainAddress, EthereumAddress} from "./CreateNewAddress";

test('can create new binance address prod', async () => {
   const bc = new BinanceChainAddress('prod');
   const addr = await bc.newAddress()
   console.log('Created new binance address prod', addr);
   expect(addr.address.length).toBe(42);
   expect(addr.privateKeyHex.length).toBe(64)
});

test('can create new binance address', async () => {
   const bc = new BinanceChainAddress('test');
   const addr = await bc.newAddress()
   console.log('Created new binance address test', addr);
   expect(addr.address.length).toBe(43);
   expect(addr.privateKeyHex.length).toBe(64)
});

test('can create new eth address', async () => {
   const bc = new EthereumAddress('test');
   const addr = await bc.newAddress();
   console.log('Created new eth address test', addr);
   expect(addr.address.length).toBe(42);
   expect(addr.privateKeyHex.length).toBe(64)
});

test('can create new eth address prod', async () => {
   const bc = new EthereumAddress('prod');
   const addr = await bc.newAddress();
   console.log('Created new eth address prod', addr);
   expect(addr.address.length).toBe(42);
   expect(addr.privateKeyHex.length).toBe(64)
});

test('create address for both eth and bnb from same sk', async () => {
   const bc = new EthereumAddress('prod');
   const addr = await bc.newAddress();
   console.log('Created new eth address prod', addr);
   const bnb = new BinanceChainAddress('prod');
   const bnbAddr = await bnb.addressFromSk(addr.privateKeyHex);
   console.log('Created', {bnbAddr, addr});
   expect(addr.address.length).toBe(42);
   expect(addr.privateKeyHex.length).toBe(64)
})