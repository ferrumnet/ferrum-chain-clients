import {
    TESTNET_CONFIG,
    TEST_ACCOUNTS,
    testChainClientFactory
} from '../testUtils/configs/TestnetConfig';
import {EthereumAddress} from '../chainClient/CreateNewAddress';
import {ChainTransactionProcessor} from './ChainTransactionProcessor';
import {Network} from 'ferrum-plumbing';

const CUR = 'FRM';

const clientFact = testChainClientFactory();

async function testSendTokenInTestnet(network: Network, sendAddr: string) {
    const client = clientFact.forNetwork(network);
    const newAddress = new EthereumAddress(TESTNET_CONFIG);
    const newAddr = await newAddress.newAddress();

    let initialBal = await client.getBalance(sendAddr, CUR);
    expect(initialBal).toBeGreaterThan(10);

    // Send some FRM to the new address.
    let addrBal = await client.getBalance(newAddr.address, CUR);
    expect(addrBal).toBe(0);

    const txId = await client.processPaymentFromPrivateKey(TEST_ACCOUNTS.mainAccountSk, newAddr.address, CUR, 10);
    const sendTx = await client.waitForTransaction(txId);
    expect(sendTx!.confirmed).toBe(true);
    addrBal = await client.getBalance(newAddr.address, CUR);
    expect(addrBal).toBe(10);

    // Sweep
    const tool = new ChainTransactionProcessor(clientFact);
    const txs = await tool.sendTokenUsingSk(
        network, TEST_ACCOUNTS.mainAccountSk, newAddr.privateKeyHex, newAddr.address,
        sendAddr, CUR, 10);
    console.log('tool.sendTokenUsingSk', txs);
    // Send some FRM to the new address.
    addrBal = await client.getBalance(newAddr.address, CUR);
    expect(addrBal).toBe(0);
}

test('send token in testnet - ethereum', async function() {
    jest.setTimeout(10000000);
    // First send some token to a new address, then return it back to us.
    await testSendTokenInTestnet('ETHEREUM', TEST_ACCOUNTS.mainAccountAddress);
});

test('send token in testnet - binance', async function() {
    jest.setTimeout(10000000);
    // First send some token to a new address, then return it back to us.
    await testSendTokenInTestnet('BINANCE', TEST_ACCOUNTS.mainAccountAddressBnb);
});
