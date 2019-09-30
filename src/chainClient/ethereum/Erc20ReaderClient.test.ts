import {testChainClientFactory, TESTNET_CONFIG} from '../../testUtils/configs/TestnetConfig';
import {Erc20ReaderClient} from './Erc20ReaderClient';
import {EthereumClient} from '../EthereumClient';

const clientFac = testChainClientFactory();

test('Read FRM info', async function () {
    jest.setTimeout(100000);
    const ethC = clientFac.forNetwork('ETHEREUM') as EthereumClient;
    const erc20 = new Erc20ReaderClient(ethC, TESTNET_CONFIG.contractAddresses['FRM']);

    const totalSuppy = await erc20.totalSupply();
    console.log('Total supply', totalSuppy);
    expect(totalSuppy).toBeGreaterThan(1000);
    expect(totalSuppy).toBeLessThan(350000000);

    const symbol = await erc20.symbol();
    expect(symbol).toBe('FRM');

    const name = await erc20.name();
    expect(name).toBe('Ferrum Network Test Token');
});
