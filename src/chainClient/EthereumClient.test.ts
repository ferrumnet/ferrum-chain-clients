import {EthereumClient} from "./EthereumClient";
import {MultiChainConfig} from './types';

const confProd = {
    web3Provider: 'https://mainnet.infura.io/v3/2b1dbb61817f4ae6ac90d9b41662993b',
    contractAddresses: {
        FRM: '0xe5caef4af8780e59df925470b050fb23c43ca68c',
    },
    contractDecimals: {
        FRM: 6,
    },
    binanceChainUrl: 'https://dex.binance.org',
    networkStage: 'test',
} as MultiChainConfig;


const conf = {
    web3Provider: 'https://rinkeby.infura.io/v3/d7fb8b4b80a04950aac6d835a3c790aa',
    contractAddresses: {
        FRM: '0x19fc63077e0e24598e74dfa450f536c214f6b1a4',
    },
    contractDecimals: {
        FRM: 6,
    },
    networkStage: 'test',
    binanceChainUrl: '',
} as MultiChainConfig;

test('send tx', async () => {
    const client = new EthereumClient('test', conf);
    // const privateKey = Buffer.from('54A5003FC3849EFA4823EFAE9B33EBD07EDA224C47A81219C9EDAC550C1402A9', 'hex');
    // const to = '0x467502Ef1c444f98349dacdf0223CCb5e2019f36';
    //
    // const txId = await client.processPaymentFromPrivateKey(privateKey, to, 'FRM', 0.001);
    // console.log('Sent tx', txId);

    var data = await client.getTransactionById('0xcfa5be19f82278d3f5bab1cad260efa0abc57fd66ddcfff46a1b07d0b0938614');
    console.log('transaction', data);
});

test('Get transaction BY ID no token transfer', async () => {
    const tid = '0x2268da5e389627122707f64b61fb9129a7cb3554117b2f07e75200833e8d7ce9';
    const client = new EthereumClient('prod', confProd);
    const tx = await client.getTransactionById(tid);
    console.log(tx);
});

test('Get transaction BY ID including token transfer', async () => {
    const tid = '0xc80881f0bcee3c53411bf8781665dbb762a0aef4780af0f8868dc7513387ebe3';
    const client = new EthereumClient('prod', confProd);
    const tx = await client.getTransactionById(tid);
    console.log(tx);
});

test('Get token transactions BY address', async function () {
    jest.setTimeout(100000);
    const addr = '0xbebe7881a7253c6c0246fabf4d159d2eb2db58e1';
    const client = new EthereumClient('prod', confProd);
    const tx = await client.getRecentTransactionsByAddress(addr);
    console.log(tx);
});

test('Get balance', async function() {
    jest.setTimeout(100000);
    const addr = '0xbebe7881a7253c6c0246fabf4d159d2eb2db58e1';
    const client = new EthereumClient('prod', confProd);
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
