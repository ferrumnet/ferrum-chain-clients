import { HexString, Injectable } from 'ferrum-plumbing';
import { AddressWithSecretKeys, Network } from 'ferrum-plumbing';
import { NetworkStage } from './types';
export interface CreateNewAddress {
    newAddress(): Promise<AddressWithSecretKeys>;
    addressFromSk(sk: HexString): Promise<AddressWithSecretKeys>;
}
/**
 * Note: Do not directly use this. Instead use ChainClientFactory
 */
export declare class CreateNewAddressFactory implements Injectable {
    private readonly ethAddress;
    private readonly rinkebyAddress;
    private readonly bitcoinTestnet;
    private readonly bitcoin;
    constructor();
    /**
     * Returns the address factory. Defaults to ETH network
     * @param network The network
     * @returns The address factory
     */
    create(network: Network): CreateNewAddress;
    __name__(): string;
}
export declare class EthereumAddress implements CreateNewAddress, Injectable {
    private readonly network;
    constructor(networkStage: NetworkStage);
    __name__(): string;
    addressFromSk(sk: HexString): Promise<AddressWithSecretKeys>;
    newAddress(): Promise<AddressWithSecretKeys>;
    private chainId;
}
//# sourceMappingURL=CreateNewAddress.d.ts.map