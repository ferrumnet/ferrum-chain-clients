import {HexString, Injectable} from 'ferrum-plumbing';
import {AddressWithSecretKeys, Network} from 'ferrum-plumbing';
// @ts-ignore
import * as crypto from '@binance-chain/javascript-sdk/lib/crypto';
// @ts-ignore
import * as utils from '@binance-chain/javascript-sdk/lib/utils';
import Web3 from 'web3';
import {NetworkStage} from './types';
import {ecrecover, ecsign, privateToAddress, publicToAddress} from 'ethereumjs-util';
import {Buffer} from 'buffer';
import {randomBytes, sha256sync} from "ferrum-crypto";
import {BitcoinAddress} from "./bitcoin/BitcoinAddress";

export interface CreateNewAddress {
    newAddress(): Promise<AddressWithSecretKeys>;
    addressFromSk(sk: HexString): Promise<AddressWithSecretKeys>;
}

/**
 * Note: Do not directly use this. Instead use ChainClientFactory
 */
export class CreateNewAddressFactory implements Injectable {
    private readonly ethAddress: EthereumAddress;
    private readonly rinkebyAddress: EthereumAddress;
    private readonly binance: BinanceChainAddress;
    private readonly binanceTestnet: BinanceChainAddress;
    private readonly bitcoinTestnet: BitcoinAddress;
    private readonly bitcoin: BitcoinAddress;
    constructor() {
        this.ethAddress = new EthereumAddress('prod');
        this.rinkebyAddress = new EthereumAddress('test');
        this.binance = new BinanceChainAddress('prod');
        this.binanceTestnet = new BinanceChainAddress('test');
        this.bitcoinTestnet = new BitcoinAddress('test');
        this.bitcoin = new BitcoinAddress('prod');
    }

    /**
     * Returns the address factory. Defaults to ETH network
     * @param network The network
     * @returns The address factory
     */
    create(network: Network): CreateNewAddress {
        switch (network) {
            case 'BINANCE':
                return this.binance;
            case 'BINANCE_TESTNET':
                return this.binanceTestnet;
            case 'ETHEREUM':
            case 'BSC':
            case 'BSC_TESTNET':
            case 'POLYGON':
            case 'MUMBAI_TESTNET':
                return this.ethAddress;
            case 'RINKEBY':
                return this.rinkebyAddress;
            case 'BITCOIN':
                return this.bitcoin;
            case 'BITCOIN_TESTNET':
                return this.bitcoinTestnet;
            default:
                // Default to EVM 
                return this.ethAddress;
        }
    }

    __name__(): string { return 'CreateNewAddressFactory'; }
}

export class BinanceChainAddress implements CreateNewAddress, Injectable {
    private readonly network: "test" | "prod";
    constructor(networkStage: NetworkStage) {
        this.network = networkStage;
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
            network: this.network === 'test' ? 'BINANCE_TESTNEET' : 'BINANCE',
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
    constructor(networkStage: NetworkStage) {
        this.network = networkStage;
    }

    __name__(): string {
        return 'EthereumAddress';
    }

    async addressFromSk(sk: HexString): Promise<AddressWithSecretKeys> {
        const skBuf = Buffer.from(sk, 'hex');
        const address = privateToAddress(skBuf);
        const testData = Buffer.from(sha256sync(Buffer.from('TEST DATA').toString('hex')), 'hex');
        const sign = ecsign(testData, skBuf, this.chainId());
        const pubKey = ecrecover(testData, sign.v, sign.r, sign.s, this.chainId());
        const verifAddress = publicToAddress(pubKey);
        if (verifAddress.toString('hex') !== address.toString('hex')) {
            const msg = 'CreateNewAddress: Error creating a new address. Could not verify generated signature';
            throw new Error(msg);
        }
        return {
            address: '0x' + address.toString('hex'),
            network: this.network === 'prod' ? 'ETHEREUM' : 'RINKEBY',
            privateKeyHex: sk,
            createdAt: Date.now(),
        }
    }

    async newAddress(): Promise<AddressWithSecretKeys> {
        return this.addressFromSk(randomBytes(32));
    }

    private chainId() {
        return this.network === 'prod' ? 1 : 4;
    }
}
