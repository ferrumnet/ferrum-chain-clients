import {bitcoinClientForProd, bitcoinClientForTest, TEST_ACCOUNTS} from "../../testUtils/configs/TestnetConfig";
import {BitcoinAddress} from "./BitcoinAddress";
import {default as bitcore, crypto, PrivateKey} from "bitcore-lib";
import BN from "bn.js";
import {arrayBufferToHex} from "ferrum-crypto";
import {ChainUtils} from "../ChainUtils";
const ECDSA = crypto.ECDSA;

test('get btc mainnet transaction', async function() {
  jest.setTimeout(100000);
  const txId = 'd360583fe967a79fd9dc71bb1fa2f10c681a7b82f45c0a115f0d4666c7bf2b57';
  const client = bitcoinClientForProd();
  const tx = (await client.getTransactionById(txId))!;
  expect(tx.fromItems[0].amount).toBe('0.09292872');
  expect(tx.toItems[1].amount).toBe('0.00115487');
  expect(tx.fee).toBe('0.00001328');
});

test('get block by number', async function() {
  jest.setTimeout(100000);
  const client = bitcoinClientForProd();
  const block = await client.getBlockByNumber(625554);
  expect(block.transactionIds.length).toBe(1294);
  expect(block.transactions!.length).toBe(1294);
});

test('get block by number from testnet', async function() {
  jest.setTimeout(100000);
  const client = bitcoinClientForTest();
  const block = await client.getBlockByNumber(1697253);
  expect(block.transactionIds.length).toBe(166);
  expect(block.transactions!.length).toBe(166);
});

test('get address', async function() {
  jest.setTimeout(100000);
  const addr = new BitcoinAddress('test');
  const a = await addr.addressFromSk(TEST_ACCOUNTS.mainAccountSk);
  expect(a.address).toBe(TEST_ACCOUNTS.mainAccountAddressBtcTestnet);

  const a1 = await addr.addressFromSk(TEST_ACCOUNTS.secondAccountSk);
  expect(a1.address).toBe(TEST_ACCOUNTS.secondAccountAddressBtcTestnet);

  const addrP = new BitcoinAddress('prod');
  const a2 = await addrP.addressFromSk(TEST_ACCOUNTS.mainAccountSk);
  expect(a2.address).toBe(TEST_ACCOUNTS.mainAccountAddressBtc);
});

test('address created from sk matches kudi algorithm', async function() {
  jest.setTimeout(100000);
  const addr = new BitcoinAddress('prod');
  const a2 = await addr.addressFromSk('63694c95e509f2252bdb30a266338e1e90feaff0609aa51c0293f11b8e93f053');
  console.log('Created address is', a2);
  expect(a2.address).toBe('1DoRPcwqq5oxAGGBT442gzf9kFmhcNUUXE');
});

test('Send some BTC to someone else', async function() {
  jest.setTimeout(100000);
  const client = bitcoinClientForTest();
  const txId = await client.processPaymentFromPrivateKeyWithGas(TEST_ACCOUNTS.mainAccountSk, TEST_ACCOUNTS.secondAccountAddressBtcTestnet,
    'BITCOIN_TESTNET:BTC', '0.00001', '0.00001');
  console.log(txId)
  await client.waitForTransaction(txId);
});

test('Send some BTC from 2nd to 1st', async function() {
  jest.setTimeout(100000);
  const client = bitcoinClientForTest();
  const txId = await client.processPaymentFromPrivateKey(TEST_ACCOUNTS.secondAccountSk, TEST_ACCOUNTS.mainAccountAddressBtcTestnet,
    'BITCOIN_TESTNET:BTC', '0.00001');
  console.log(txId)
});

test('Signature matches bitcore-lib', async function () {
  jest.setTimeout(100000);
  const client = bitcoinClientForTest();
  const tx = await client.createPaymentTransaction(TEST_ACCOUNTS.mainAccountAddressBtcTestnet,
    TEST_ACCOUNTS.secondAccountAddressBtcTestnet, 'BITCOIN_TESTNET:BTC', '0.00001', '0.00001');
  const toSign = tx.signableHex!;// 'fb6d683e8e2f753c580cf4d84d2b0bf483acb47ffc756eb53f359ff05c1eacdf';
  const toSigBuf = Buffer.from(toSign, 'hex');
  const ourSig = await client.sign(TEST_ACCOUNTS.mainAccountSk, toSign, true);
  // @ts-ignore
  const sig = bitcore.crypto.Signature.fromCompact(Buffer.from(ChainUtils.signatureToHex(ourSig), 'hex'));
  const sk = new PrivateKey(TEST_ACCOUNTS.mainAccountSk, bitcore.Networks.testnet);
  const signInv = new BN(toSigBuf).toArrayLike(Buffer, 'le', 32);
  // @ts-ignore
  const theirsSig = ECDSA.sign(signInv, sk, 'little');
  console.log(sig.toString());
  console.log(theirsSig.toString());
  const ourVer = ECDSA.verify(signInv, sig, sk.toPublicKey(), 'little');
  const theirVer = ECDSA.verify(signInv, theirsSig, sk.toPublicKey(), 'little');
  console.log(ourVer, theirVer);
  expect(ourVer).toBe(true);
  expect(theirVer).toBe(true);
});