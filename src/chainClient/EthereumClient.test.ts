import {
    ethereumClientForProd,
    TEST_ACCOUNTS, TEST_FRM,
    testChainClientFactory, testGanacheClientFactory,
} from '../testUtils/configs/TestnetConfig';
import {retry, sleep} from "ferrum-plumbing";
import {ChainUtils} from "./ChainUtils";
import {FRM} from "./GasPriceProvider";

const clientFac = testChainClientFactory();

function ethereumClientForTest() { return clientFac.forNetwork('RINKEBY'); }

test('send tx', async function() {
    jest.setTimeout(100000);
    const client = ethereumClientForProd();
    // const privateKey = Buffer.from('54A5003FC3849EFA4823EFAE9B33EBD07EDA224C47A81219C9EDAC550C1402A9', 'hex');
    // const to = '0x467502Ef1c444f98349dacdf0223CCb5e2019f36';
    //
    // const txId = await client.processPaymentFromPrivateKey(privateKey, to, 'FRM', 0.001);
    // console.log('Sent tx', txId);

    const data = await client.getTransactionById('0x9213b0ae343ae6d59a5c396d92afc70c1b535365d256cd786423140f1538ba72');
    expect(data!.confirmed).toBe(true);
    console.log('transaction', data);
});

test('toDecimal', () => {
    let v = ChainUtils.toDecimalStr(122020, 0);
    expect(v).toBe('122020.0');
    v = ChainUtils.toDecimalStr(12, 18); // eth
    expect(v).toBe('0.000000000000000012');
    v = ChainUtils.toDecimalStr(12, 18 - 9); // gwei
    expect(v).toBe('0.000000012');
    v = ChainUtils.toDecimalStr(122020, 2);
    expect(v).toBe('1220.20');
    v = ChainUtils.toDecimalStr(122020, 1);
    expect(v).toBe('12202.0');
});

test('toBigInt', () => {
    let v = ChainUtils.toBigIntStr(12.2020, 0);
    expect(v).toBe('12');
    v = ChainUtils.toBigIntStr(12.2020, 2);
    expect(v).toBe('1220');
    v = ChainUtils.toBigIntStr(12.2020, 4);
    expect(v).toBe('122020');
    v = ChainUtils.toBigIntStr(12.2020, 8);
    expect(v).toBe('1220200000');
    v = ChainUtils.toBigIntStr(12.2020, 12);
    expect(v).toBe('12202000000000');
    v = ChainUtils.toBigIntStr(0.000001, 2);
    expect(v).toBe('000');
    v = ChainUtils.toBigIntStr(0.000001, 12);
    expect(v).toBe('0000001000000');

    v = ChainUtils.toBigIntStr('12.2020', 0);
    expect(v).toBe('12');
    v = ChainUtils.toBigIntStr('12.2020', 2);
    expect(v).toBe('1220');
    v = ChainUtils.toBigIntStr('12.2020', 4);
    expect(v).toBe('122020');
    v = ChainUtils.toBigIntStr('12.2020', 8);
    expect(v).toBe('1220200000');
    v = ChainUtils.toBigIntStr('12.2020', 12);
    expect(v).toBe('12202000000000');
    v = ChainUtils.toBigIntStr('0.000001', 2);
    expect(v).toBe('000');
    v = ChainUtils.toBigIntStr('0.000001', 12);
    expect(v).toBe('0000001000000');
});

test('create a new address', async  () => {
    const addr = await testChainClientFactory().newAddress('ETHEREUM').newAddress();
    console.log(addr);
});

test('debug tx', async function() {
    jest.setTimeout(10000000);
    const client = ethereumClientForTest();
    const txId = '0xd3804b1ec84f98c6e30b04987f082b8d4c2ef307da41d5c450cfa4a70e437b39';
    // const txId = '0xdd70b1151a6d8d401e744ed61d74d2668b7ccac2444c7d8acf912ad6466d41ac';
    const tx = await client.getTransactionById(txId);
    console.log(JSON.stringify(ChainUtils.simpleTransactionToServer(tx!)));
});

test('send tx with overwritten gas as params', async () => {
    jest.setTimeout(10000000);
    const client = ethereumClientForTest();
    const gas = '0.000333333';
    const txId = await client.processPaymentFromPrivateKeyWithGas(TEST_ACCOUNTS.mainAccountSk,
      TEST_ACCOUNTS.secondAccountAddress, 'RINKEBY:' + TEST_FRM, '0.1', gas);
    console.log('Submitted tx ', txId, 'with custom gas ', gas);
    const tx = await client.waitForTransaction(txId);
    console.log('Tx result ', tx);
});

test('send rinkeby tx that is failed', async () => {
    jest.setTimeout(10000000);
    const client = ethereumClientForTest();
    const tx = await client.getTransactionById('0xa5b6ceb8bfed8851c82344d5382c1d31a814ec8d6ae3d876cb4eacd0697582f3');
    console.log('GOT TX ', tx);

});


test('send tx with overwritten gas', async () => {
    jest.setTimeout(10000000);
    const client = ethereumClientForTest();
    const gas = '0.000333333';
    const txId = await client.processPaymentFromPrivateKeyWithGas(TEST_ACCOUNTS.mainAccountSk,
        TEST_ACCOUNTS.secondAccountAddress, 'RINKEBY:' + TEST_FRM, '0.1', gas);
    console.log('Submitted tx ', txId, 'with custom gas ', gas);
    const tx = await client.waitForTransaction(txId);
    console.log('Tx result ', tx);
});

test('Get transaction BY ID no token transfer', async () => {
    const tid = '0x2268da5e389627122707f64b61fb9129a7cb3554117b2f07e75200833e8d7ce9';
    const client = ethereumClientForProd();
    const tx = await client.getTransactionById(tid);
    console.log(tx);
});

test('Get transaction BY ID including token transfer', async () => {
    const tid = '0xc80881f0bcee3c53411bf8781665dbb762a0aef4780af0f8868dc7513387ebe3';
    const client = ethereumClientForProd();
    const tx = await client.getTransactionById(tid);
    console.log(tx);
    expect(tx).toBeTruthy();
    expect(tx!.confirmed).toBe(true);
});

test('Get transaction BY ID including GUSD transfer', async function() {
    jest.setTimeout(1000000);
    const tid = '0x86b022a1ce0a5874d8bbf44bb2dacdca610737a30c6e945eea4d29bb77c44445';
    const client = ethereumClientForProd();
    const tx = await client.getTransactionById(tid);
    const server = ChainUtils.simpleTransactionToServer(tx!);
    console.log('Server tx', server);
    expect(tx).toBeTruthy();
    expect(tx!.confirmed).toBe(true);
    expect(tx!.fromItems[0].amount).toBe('0.20');
    expect(Number(server.items[2].amount)).toBe(20);
});

test('Get transaction BY ID including token transfer on testnet', async function() {
    jest.setTimeout(1000000);
    const tid = '0xd6bb804504d747508f41e3d3e0e0182714e1937a6eeadaac649e92e073aeb9be';
    const client = ethereumClientForTest();
    const tx = await client.getTransactionById(tid);
    console.log(tx);
    expect(tx).toBeTruthy();
    expect(tx!.confirmed).toBe(true);
});

test('Get failed transaction BY ID including token transfer on testnet', async function() {
    jest.setTimeout(1000000);
    const tid = '0x7262ab02ce718d963723be48f6bb10d8507db898f71d751360f64493f219985f';
    const client = ethereumClientForTest();
    const tx = await client.getTransactionById(tid);
    console.log(tx);
    expect(tx).toBeTruthy();
    expect(tx!.confirmed).toBe(false);
    expect(tx!.reason).toBeTruthy();
});

test('Get token transactions BY address', async function () {
    jest.setTimeout(100000);
    const addr = '0x89a39492ec912c0e3533db88672ecaad7bb92a82';
    const client = ethereumClientForProd();
    const tx = await client.getRecentTransactionsByAddress(addr, ['ETHEREUM:' + FRM]);
    console.log(tx);
});

test('Get balance', async function() {
    jest.setTimeout(100000);
    const addr = '0xbebe7881a7253c6c0246fabf4d159d2eb2db58e1';
    const client = ethereumClientForProd();
    let bal = await client.getBalance(addr, 'ETHEREUM:' + FRM);
    expect(bal).toBeTruthy();
    console.log('Balance is ', bal);
    let err : any;
    try {
        await client.getBalance(addr, 'ETHEREUM:RANDOM_TOK');
    } catch (e) {
        err = e;
    }
    expect(err).toBeTruthy();
    bal = await client.getBalance(addr, 'ETHEREUM:ETH');
    console.log('Eth balance is ', bal);
    expect(bal).toBeTruthy();
});

test('Get erc20 transaction by id', async function() {
    jest.setTimeout(100000);
    const txid = '0x20ff49c41e5f5daea28e02f694ae6a4bbef25b5ee653d2473eaac8cd959c3434';
    const client = ethereumClientForProd();
    const usdcTx = await client.getTransactionById(txid);
    expect(usdcTx!.fromItems[0].amount).toBe('100.214618');
    expect(usdcTx!.fromItems[0].currency).toBe('ETHEREUM:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
});

test('Get another erc20 transaction by id', async function() {
    jest.setTimeout(100000);
    const txid = '0x94b46e2c81af39d2da3ed691ee08482d905dfaf8016d44a7565fb8d5acd7fa61';
    const client = ethereumClientForProd();
    const usdcTx = await client.getTransactionById(txid);
    expect(usdcTx!.fromItems[0].amount).toBe('85619.0');
});

test('Get block by number', async function() {
    jest.setTimeout(10000000);
    const blockNo = 8825650;
    const client = ethereumClientForProd();
    const block = await retry(async () => await client.getBlockByNumber(blockNo));
    console.log('res', block);
    const ethTx = block!.transactions!
        .find(t => t.id === '0xf1607bd6deaf6bfed0b15b1a34275ddd5eb65963b7a39dec7489cfb012a08498');
    const usdcTx = block!.transactions!
        .find(t => t.id === '0x20ff49c41e5f5daea28e02f694ae6a4bbef25b5ee653d2473eaac8cd959c3434');
    console.log(ethTx, usdcTx);
    expect(ethTx!.fromItems[0].amount).toBe('0.04');
    expect(usdcTx!.fromItems[0].amount).toBe('100.214618');
    expect(usdcTx!.fromItems[0].currency).toBe('ETHEREUM:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
});

test('sen eth using ganache', async function() {
    jest.setTimeout(100000);
    const clientFact = testGanacheClientFactory();
    const network = 'ETHEREUM';
    const client = clientFact.forNetwork(network);
    const sk = '6e56b0ec570646d9a27b1e091987293a4cbc034520bc0e59f44edc04367f4b64';
    const fromAddr = '0xAbf3fBC38b759C552Bf9C0eaffE5d2F4F09Aab0a';
    const addr = await clientFact.newAddress('ETHEREUM').newAddress();
    const tid = await client.processPaymentFromPrivateKey(sk, addr.address, network + ':ETH', '0.1');
    await sleep(1000);
    const tx = await client.waitForTransaction(tid);
    expect(tx!.confirmed).toBe(true);
    // Return the money
    const tid2 = await client.processPaymentFromPrivateKey(addr.privateKeyHex, fromAddr, network + ':ETH',
        '0.0991');
    const tx2 = await client.waitForTransaction(tid2);
    expect(tx2!.confirmed).toBe(true);
});

test('Check transaction fee', async function() {
    jest.setTimeout(100000);
    const eth = '0.001';
    const gas = '0.0000001';
    const txId = await sendEth(eth, gas);

    const clientFact = testGanacheClientFactory();
    const client = clientFact.forNetwork('ETHEREUM');
    const tx = await client.getTransactionById(txId);
    const serverTx = ChainUtils.simpleTransactionToServer(tx!);
    console.log(tx);
    console.log(serverTx);
    console.log(JSON.stringify(serverTx));
});

async function sendEth(eth: string, gas: string) {
    const clientFact = testGanacheClientFactory();
    const network = 'ETHEREUM';
    const client = clientFact.forNetwork(network);
    const sk = '6e56b0ec570646d9a27b1e091987293a4cbc034520bc0e59f44edc04367f4b64';
    const addr = await clientFact.newAddress('ETHEREUM').newAddress();
    const tid = await client.processPaymentFromPrivateKeyWithGas(sk, addr.address, network + ':ETH', eth, gas);
    await sleep(1000);
    const tx = await client.waitForTransaction(tid);
    expect(tx!.confirmed).toBe(true);
    return tid;
}
