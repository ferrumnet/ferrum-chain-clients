import { CreateNewAddress } from "../CreateNewAddress";
import { AddressWithSecretKeys, Injectable } from "ferrum-plumbing";
import { NetworkStage } from "../types";
export declare class BitcoinAddress implements CreateNewAddress, Injectable {
    private addressGen;
    private readonly network;
    constructor(networkStage: NetworkStage);
    __name__(): string;
    addressFromSk(sk: string): Promise<AddressWithSecretKeys>;
    newAddress(): Promise<AddressWithSecretKeys>;
}
//# sourceMappingURL=BitcoinAddress.d.ts.map