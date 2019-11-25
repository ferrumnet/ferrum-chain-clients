import { HexString, Injectable } from 'ferrum-plumbing';
import { AddressWithSecretKeys, Network } from 'ferrum-plumbing';
import { MultiChainConfig } from './types';
export interface CreateNewAddress {
    newAddress(): Promise<AddressWithSecretKeys>;
    addressFromSk(sk: HexString): Promise<AddressWithSecretKeys>;
}
/**
 * Note: Do not directly use this. Instead use ChainClientFactory
 */
export declare class CreateNewAddressFactory implements Injectable {
    private binancaAddress;
    private ethAddress;
    constructor(binancaAddress: BinanceChainAddress, ethAddress: EthereumAddress);
    create(network: Network): CreateNewAddress;
    __name__(): string;
}
export declare class BinanceChainAddress implements CreateNewAddress, Injectable {
    private readonly network;
    constructor(config: MultiChainConfig);
    __name__(): string;
    addressFromSk(sk: HexString): Promise<AddressWithSecretKeys>;
    newAddress(): Promise<AddressWithSecretKeys>;
}
export declare class EthereumAddress implements CreateNewAddress, Injectable {
    private readonly network;
    private readonly provider;
    private web3;
    constructor(config: MultiChainConfig);
    __name__(): string;
    addressFromSk(sk: HexString): Promise<{
        address: string;
        network: Network;
        privateKeyHex: string;
        createdAt: number;
    }>;
    newAddress(): Promise<AddressWithSecretKeys>;
}
//# sourceMappingURL=CreateNewAddress.d.ts.map