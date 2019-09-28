import {
    TEST_ACCOUNTS,
    testChainClientFactory
} from '../testUtils/configs/TestnetConfig';
import {ChainTransactionProcessor} from './ChainTransactionProcessor';
import {Network} from 'ferrum-plumbing';

const clientFact = testChainClientFactory();

async function testSendTokenInTestnet(network: Network, sendAddr: string, currency: string) {
    const client = clientFact.forNetwork(network);
    const newAddress = clientFact.newAddress(network);
    const newAddr = await newAddress.newAddress();
    console.log('newAddr:', newAddr);

    let initialBal = await client.getBalance(sendAddr, currency);
    expect(initialBal).toBeGreaterThan(10);

    // Send some FRM to the new address.
    let addrBal = await client.getBalance(newAddr.address, currency) || 0;
    expect(addrBal).toBe(0);

    const txId = await client.processPaymentFromPrivateKey(TEST_ACCOUNTS.mainAccountSk, newAddr.address, currency, 10);
    const sendTx = await client.waitForTransaction(txId);
    expect(sendTx!.confirmed).toBe(true);
    addrBal = await client.getBalance(newAddr.address, currency) || 0;
    expect(addrBal).toBe(10);

    // Sweep
    const tool = new ChainTransactionProcessor(clientFact);
    const txs = await tool.sendTokenUsingSk(
        network, TEST_ACCOUNTS.mainAccountSk, newAddr.privateKeyHex, newAddr.address,
        sendAddr, currency, 10);
    console.log('tool.sendTokenUsingSk', txs);
    // Send some FRM to the new address.
    addrBal = await client.getBalance(newAddr.address, currency) || 0;
    expect(addrBal).toBe(0);
}

test('send token in testnet - ethereum', async function() {
    jest.setTimeout(10000000);
    // First send some token to a new address, then return it back to us.
    await testSendTokenInTestnet('ETHEREUM', TEST_ACCOUNTS.mainAccountAddress, 'FRM');
});

test('send token in testnet - binance', async function() {
    jest.setTimeout(10000000);
    // First send some token to a new address, then return it back to us.
    await testSendTokenInTestnet('BINANCE', TEST_ACCOUNTS.mainAccountAddressBnb, 'FRM-410');
});
