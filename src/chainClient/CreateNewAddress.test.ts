import {BinanceChainAddress, EthereumAddress} from "./CreateNewAddress";

test('can create new binance address', async () => {
   const bc = new BinanceChainAddress({custom: { networkStage: 'test'} } as any);
   const addr = await bc.newAddress()
   expect(addr.address.length).toBe(43);
   expect(addr.privateKeyHex.length).toBe(64)
});

test('can create new eth address', async () => {
   const bc = new EthereumAddress({custom: { networkStage: 'test'} } as any);
   const addr = await bc.newAddress();
   expect(addr.address.length).toBe(40);
   expect(addr.privateKeyHex.length).toBe(64)
});
