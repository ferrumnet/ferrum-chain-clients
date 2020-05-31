import { EtherScanHistoryClient } from "./EtherScanHistoryClient";
import { LoggerFactory, ConsoleLogger } from "ferrum-plumbing";

const TEST_KEY = 'R1CCBA5638M8B539P8K7B8UPF8IJN52NBJ';

test('Get transactions for address including FRM', async function() {
    jest.setTimeout(100000);
    const ethHis = new EtherScanHistoryClient(
        TEST_KEY, 'ETHEREUM', new LoggerFactory(n => new ConsoleLogger(n)));
    const txs = await ethHis.getTransactionsForAddress('0xa178609bfa90ae975e1bfa07e16e9557f6695962', 10145915, 10145918, '');
    console.log('ALL TXS ARE ', txs.length);
    const thaTx = txs.find(t => t.id === '0xc901fc3bec1484562bd1bcfcd4b3e8443b0fc3ee177d0be69e4db091e1ad6d6c');
    console.log('Token example', thaTx);
    expect(thaTx!.fee).toBe('0.001083717100000000');
    expect(thaTx!.fromItems.length).toBe(1);
    expect(thaTx!.toItems.length).toBe(1);
    expect(thaTx!.toItems[0].currency).toBe('ETHEREUM:0xe5caef4af8780e59df925470b050fb23c43ca68c');
    expect(thaTx!.toItems[0].address).toBe('0xa178609bfa90ae975e1bfa07e16e9557f6695962');
});

test('Get transactions for address including FRM 2', async function() {
    jest.setTimeout(100000);
    const ethHis = new EtherScanHistoryClient(
        TEST_KEY, 'ETHEREUM', new LoggerFactory(n => new ConsoleLogger(n)));
    const txs = await ethHis.getTransactionsForAddress('0xa178609bfa90ae975e1bfa07e16e9557f6695962', 10162617, 10162618, '');
    console.log('ALL TXS ARE ', txs.length);
    const thaTx = txs.find(t => t.id === '0xa85444c5f1bb5fd9022ca6ae43f826b8b0ab78085bb1569dfb329fb974c630e5');
    console.log('Token example', thaTx);
    expect(thaTx!.fromItems.length).toBe(1);
    expect(thaTx!.toItems.length).toBe(1);
    expect(thaTx!.toItems[0].currency).toBe('ETHEREUM:0xe5caef4af8780e59df925470b050fb23c43ca68c');
    expect(thaTx!.toItems[0].address).toBe('0xad22cd464034f4ecf1bfd5f83db8a045f3d24467');
});


test('Get internal txs', async function() {
    jest.setTimeout(100000);
    const ethHis = new EtherScanHistoryClient(
        TEST_KEY, 'ETHEREUM', new LoggerFactory(n => new ConsoleLogger(n)));
    const bl = await ethHis.getNonBlockTransactions(10105543, 10105544, '');
    console.log('BL', bl)
    expect(bl.length).toBe(26);
    expect(bl[24].fromItems[0].amount).toBe("25000000000000000");
    expect(bl[24].fromItems[1].amount).toBe("25000000000000000");
    expect(bl[24].id).toBe('0x89b31bb8b3df6f2fe8ef232b269e0427bb698f148d916e901ee1eff4a40187c0');
});

test('Get txs for an address', async function() {
    jest.setTimeout(100000);
    const ethHis = new EtherScanHistoryClient(
        TEST_KEY, 'ETHEREUM', new LoggerFactory(n => new ConsoleLogger(n)));
    const txs = await ethHis.getTransactionsForAddress('0xee4B6610DFd531027CA1D641772DaCf640bb7b8D', 0, 10105544, '');
    console.log('ALL TXS ARE ', txs.length);
    const thaTx = txs.find(t => t.id === '0x2e9a76215bffcb9d940808dedd3047ee0a577eddc198ef91836d2f167deeca0a');
    console.log('Internal example', thaTx);
    expect(thaTx!.fee).toBe('43345000000000');
    expect(thaTx!.fromItems.length).toBe(2);
});
