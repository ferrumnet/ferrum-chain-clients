// @ts-ignore
import sdk from '@binance-chain/javascript-sdk';
import {MultiChainConfig} from './types';
import {BinanceChainClient} from './BinanceChainClient';
import {binanceClientForProd, TEST_ACCOUNTS, testChainClientFactory} from '../testUtils/configs/TestnetConfig';

const conf = {
    web3Provider: 'https://rinkeby.infura.io/v3/d7fb8b4b80a04950aac6d835a3c790aa',
    contractAddresses: {
        'FRM': '',
    },
    contractDecimals: {
        'FRM': 6,
    },
    binanceChainUrl: 'https://testnet-dex.binance.org',
    binanceChainSeedNode: 'https://data-seed-pre-0-s3.binance.org',
    networkStage: 'test',
} as MultiChainConfig;
const CURRENCY = 'FRM-410';

test('send tx', async function() {
    jest.setTimeout(1000000);
    const client = new BinanceChainClient('test', conf);
    const privateKey = 'e0d33c540f7eff1d20a1de049236542fd2d21a365e42e01b0a416f93aa078890';
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

test('ppk', async () => {
   // const nmonic = process.env.NMN;
   //  const sk = sdk.crypto.getPrivateKeyFromMnemonic(nmonic);
    const sk = TEST_ACCOUNTS.mainAccountSk; // process.env.sk;
    const addr = sdk.crypto.getAddressFromPrivateKey(sk, 'tbnb')
    console.log(addr)

    const skNew = process.env.PRIVATE_KEY;
    console.log('About to process payment from ', sdk.crypto.getAddressFromPrivateKey(skNew, 'tbnb'), skNew);
    const client = testChainClientFactory();
    const bnbTest = client.forNetwork('BINANCE');
    // const txId = await bnbTest.processPaymentFromPrivateKey(skNew!, TEST_ACCOUNTS.mainAccountAddressBnb,
    //     'FRM-410', 500);
    // const txId = await bnbTest.processPaymentFromPrivateKey(skNew!, TEST_ACCOUNTS.mainAccountAddressBnb, 'BNB', 0.1);
    // console.log('Tx_Id', txId)
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

test('get block prod', async function() {
    jest.setTimeout(1000000);
    // NIH
    const client = binanceClientForProd();
    const block = await client.getBlockByNumber(44395899);
    console.log(block);
    const tx = block.transactions![0];
    expect(tx.from.amount).toBe(0.0001);
    expect(tx.from.currency).toBe('BNB');
    expect(tx.fee).toBe(0.000375);
});

test('get block test', async function() {
    jest.setTimeout(1000000);
    const client = new BinanceChainClient('test', conf);
    const block = await client.getBlockByNumber(49483308);
    // const block = await client.getBlockByNumber(49483742);
    console.log(block);
    const tx = block.transactions![0];
    expect(tx.from.address).toBe('tbnb1zqs84eg34kur74uhs6x6m0ketawgtf4nqcj27j');
    expect(tx.to.address).toBe('tbnb189az9plcke2c00vns0zfmllfpfdw67dtv25kgx');
    expect(tx.from.amount).toBe(0.00000001);
    expect(tx.to.amount).toBe(0.00000001);
    expect(tx.from.currency).toBe('BNB');
    expect(tx.fee).toBe(0.000375);
    expect(tx.memo).toBe('Test transaction');
});
