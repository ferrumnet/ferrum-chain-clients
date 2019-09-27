// @ts-ignore
import sdk from '@binance-chain/javascript-sdk';
import {BinanceChainClient} from "./ChainClientFactory";
import {MultiChainConfig} from './types';

const conf = {
    web3Provider: 'https://rinkeby.infura.io/v3/d7fb8b4b80a04950aac6d835a3c790aa',
    contractAddresses: {
        'FRM': '',
    },
    contractDecimals: {
        'FRM': 6,
    },
    binanceChainUrl: 'https://testnet-dex.binance.org',
    networkStage: 'test',
} as MultiChainConfig;
const CURRENCY = 'FRM-410';

test('send tx', async () => {
    const client = new BinanceChainClient('test', conf);
    const privateKey = Buffer.from('e0d33c540f7eff1d20a1de049236542fd2d21a365e42e01b0a416f93aa078890', 'hex');
    const to = 'tbnb136zj94xtalc7tp6pcp73r4zx9csdh8cyn7re2d';
    const currency = 'FRM-410';

    const txId = await client.processPaymentFromPrivateKey(privateKey, to, currency, 0.001);
    console.log('Sent tx', txId);
});

test('get tx', async () => {
    const txId = 'BFB88A41EB45A657D204FC34660B95DF0B70E3BD2D4CE6E120CA4DF6D87C50F3';
    const client = new BinanceChainClient('test', conf);
    const tx = await client.getTransactionById(txId);
    console.log(tx);
});

test('get txt for user', async () => {
    const address = 'tbnb136zj94xtalc7tp6pcp73r4zx9csdh8cyn7re2d';
    const client = new BinanceChainClient('test', conf);
    const tx = await client.getRecentTransactionsByAddress(address);
    console.log(tx);
});

test('ppk', () => {
   // const nmonic = process.env.NMN;
   //  const sk = sdk.crypto.getPrivateKeyFromMnemonic(nmonic);
    const sk = process.env.sk;
    const addr = sdk.crypto.getAddressFromPrivateKey(sk, 'bnb')
    console.log(addr)
});

test('get balance', async () => {
    const address = 'tbnb136zj94xtalc7tp6pcp73r4zx9csdh8cyn7re2d';
    const client = new BinanceChainClient('test', conf);
    let bal = await client.getBalance(address, 'RANDOM_TOK');
    expect(bal).toBeUndefined()
    bal = await client.getBalance(address, CURRENCY);
    expect(bal).toBeTruthy();
    console.log('Balance was ', bal);
    bal = await client.getBalance(address, 'BNB');
    expect(bal).toBeTruthy();
    console.log('Balance was ', bal);
});
