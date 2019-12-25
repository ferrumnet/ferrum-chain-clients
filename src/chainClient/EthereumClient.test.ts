import {
    ethereumClientForProd,
    TEST_ACCOUNTS,
    testChainClientFactory, testGanacheClientFactory,
} from '../testUtils/configs/TestnetConfig';
import {retry, sleep} from "ferrum-plumbing";
import {ChainUtils} from "./ChainUtils";

const clientFac = testChainClientFactory();

function ethereumClientForTest() { return clientFac.forNetwork('ETHEREUM'); }

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

test('create a new address', async  () => {
    const addr = await testChainClientFactory().newAddress('ETHEREUM').newAddress();
    console.log(addr);
});

test('send tx with overwritten gas', async () => {
    jest.setTimeout(10000000);
    const client = ethereumClientForTest();
    const gas = 0.000333333;
    const txId = await client.processPaymentFromPrivateKeyWithGas(TEST_ACCOUNTS.mainAccountSk,
        TEST_ACCOUNTS.secondAccountAddress, 'FRM', 10, gas);
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

test('Get transaction BY ID including GUSD transfer', async () => {
    const tid = '0xccd420c0661162d95ced859a686a31bc0ae83b03c31d552af1318dbcabc7fc1c';
    const client = ethereumClientForProd();
    const tx = await client.getTransactionById(tid);
    console.log(tx);
    expect(tx).toBeTruthy();
    expect(tx!.confirmed).toBe(true);
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
    const tx = await client.getRecentTransactionsByAddress(addr);
    console.log(tx);
});

test('Get balance', async function() {
    jest.setTimeout(100000);
    const addr = '0xbebe7881a7253c6c0246fabf4d159d2eb2db58e1';
    const client = ethereumClientForProd();
    let bal = await client.getBalance(addr, 'FRM');
    expect(bal).toBeTruthy();
    console.log('Balance is ', bal);
    let err : any;
    try {
        await client.getBalance(addr, 'RANDOM_TOK');
    } catch (e) {
        err = e;
    }
    expect(err).toBeTruthy();
    bal = await client.getBalance(addr, 'ETH');
    console.log('Eth balance is ', bal);
    expect(bal).toBeTruthy();
});

test('Get block by number', async function() {
    jest.setTimeout(100000);
    const blockNo = 8825650;
    const client = ethereumClientForProd();
    const block = await retry(async () => await client.getBlockByNumber(blockNo));
    console.log('res', block);
    const ethTx = block!.transactions!
        .find(t => t.id === '0xf1607bd6deaf6bfed0b15b1a34275ddd5eb65963b7a39dec7489cfb012a08498');
    const usdcTx = block!.transactions!
        .find(t => t.id === '0x20ff49c41e5f5daea28e02f694ae6a4bbef25b5ee653d2473eaac8cd959c3434');
    console.log(ethTx, usdcTx);
    expect(ethTx!.from.amount).toBe(0.04);
    expect(usdcTx!.from.amount).toBe(100214618);
    expect(usdcTx!.from.currency).toBe('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
});

test('sen eth using ganache', async function() {
    jest.setTimeout(100000);
    const clientFact = testGanacheClientFactory();
    const client = clientFact.forNetwork('ETHEREUM');
    const sk = '6af7f508641153dedc1599547b681ad5770381de8be6bfa1d6f623db6918f49e';
    const fromAddr = '0x0933Ccf2b714008a7F7FE3C227E3435e1682511f';
    const addr = await clientFact.newAddress('ETHEREUM').newAddress();
    const tid = await client.processPaymentFromPrivateKey(sk, addr.address, 'ETH', 0.1);
    await sleep(1000);
    const tx = await client.waitForTransaction(tid);
    expect(tx!.confirmed).toBe(true);
    // Return the money
    const tid2 = await client.processPaymentFromPrivateKey(addr.privateKeyHex, fromAddr, 'ETH',
        0.0991);
    const tx2 = await client.waitForTransaction(tid2);
    expect(tx2!.confirmed).toBe(true);
});

test('Check transaction fee', async function() {
    jest.setTimeout(100000);
    const eth = 0.001;
    const gas = 0.0000001;
    const txId = await sendEth(eth, gas);

    const clientFact = testGanacheClientFactory();
    const client = clientFact.forNetwork('ETHEREUM');
    const tx = await client.getTransactionById(txId);
    const serverTx = ChainUtils.simpleTransactionToServer(tx!);
    console.log(tx);
    console.log(serverTx);
    console.log(JSON.stringify(serverTx));
});

async function sendEth(eth: number, gas: number) {
    const clientFact = testGanacheClientFactory();
    const client = clientFact.forNetwork('ETHEREUM');
    const sk = '6af7f508641153dedc1599547b681ad5770381de8be6bfa1d6f623db6918f49e';
    const addr = await clientFact.newAddress('ETHEREUM').newAddress();
    const tid = await client.processPaymentFromPrivateKeyWithGas(sk, addr.address, 'ETH', eth, gas);
    await sleep(1000);
    const tx = await client.waitForTransaction(tid);
    expect(tx!.confirmed).toBe(true);
    return tid;
}
