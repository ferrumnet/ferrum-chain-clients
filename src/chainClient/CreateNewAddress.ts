import {HexString, Injectable} from 'ferrum-plumbing';
import {AddressWithSecretKeys, Network} from 'ferrum-plumbing';
// @ts-ignore
import * as crypto from '@binance-chain/javascript-sdk/lib/crypto';
// @ts-ignore
import * as utils from '@binance-chain/javascript-sdk/lib/utils';
import Web3 from 'web3';
import {MultiChainConfig} from './types';

export interface CreateNewAddress {
    newAddress(): Promise<AddressWithSecretKeys>;
    addressFromSk(sk: HexString): Promise<AddressWithSecretKeys>;
}

/**
 * Note: Do not directly use this. Instead use ChainClientFactory
 */
export class CreateNewAddressFactory implements Injectable {
    constructor(private binancaAddress: BinanceChainAddress, private ethAddress: EthereumAddress) {
    }

    create(network: Network): CreateNewAddress {
        switch (network) {
            case 'BINANCE':
                return this.binancaAddress;
            case 'ETHEREUM':
                return this.ethAddress;
            default:
                throw new Error('CreateNewAddressFactory.create: Network not supported: ' + network)
        }
    }

    __name__(): string { return 'CreateNewAddressFactory'; }
}

export class BinanceChainAddress implements CreateNewAddress, Injectable {
    private readonly network: "test" | "prod";
    constructor(config: MultiChainConfig) {
        this.network = config.networkStage;
    }

    __name__(): string {
        return 'BinanceChainAddress';
    }

    async addressFromSk(sk: HexString) {
        const pk = crypto.getPublicKeyFromPrivateKey(sk) as HexString;
        const address = crypto.getAddressFromPrivateKey(sk, this.network === 'prod' ? 'bnb' : 'tbnb') as Buffer;
        // Test
        const testData = utils.sha3(Web3.utils.toHex('TEST DATA'));
        const sign = crypto.generateSignature(testData, sk) as Buffer;
        const verif = crypto.verifySignature(sign, testData, pk) as Buffer;
        if (!verif) {
            const msg = 'CreateNewAddress: Error creating a new address. Could not verify generated signature';
            console.error(msg, sk);
            throw new Error(msg);
        }
        return {
            address: address.toString('hex'),
            network: 'BINANCE' as Network,
            privateKeyHex: sk,
            createdAt: Date.now(),
        } as AddressWithSecretKeys;
    }

    async newAddress(): Promise<AddressWithSecretKeys> {
        // Create a new private key
        const sk = crypto.generatePrivateKey() as HexString;
        return this.addressFromSk(sk);
    }
}

export class EthereumAddress implements CreateNewAddress, Injectable {
    private readonly network: "test" | "prod";
    private readonly provider: string;
    private web3: Web3;
    constructor(config: MultiChainConfig) {
        this.network = config.networkStage;
        this.provider = config.web3Provider;
        this.web3 = new Web3(new Web3.providers.HttpProvider(this.provider));
    }

    __name__(): string {
        return 'EthereumAddress';
    }

    async addressFromSk(sk: HexString) {
        const account = this.web3.eth.accounts.privateKeyToAccount(sk);
        const testData = utils.sha3(Buffer.from('TEST DATA').toString('hex')).toString('hex');
        const sign = account.sign(testData);
        const verif = this.web3.eth.accounts.recover(sign);
        if (verif !== account.address) {
            const msg = 'CreateNewAddress: Error creating a new address. Could not verify generated signature';
            console.error(msg, account.privateKey);
            throw new Error(msg);
        }
        return {
            address: account.address,
            network: 'ETHEREUM' as Network,
            privateKeyHex: account.privateKey.substr(2),
            createdAt: Date.now(),
        }
    }

    async newAddress(): Promise<AddressWithSecretKeys> {
        const web3 = new Web3(new Web3.providers.HttpProvider(this.provider));
        return this.addressFromSk(web3.utils.randomHex(32));
    }
}
