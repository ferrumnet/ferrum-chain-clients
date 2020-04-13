import {CreateNewAddress} from "../CreateNewAddress";
import {AddressWithSecretKeys, Injectable, Network} from "ferrum-plumbing";
import {AddressFromPublicKey, arrayBufferToHex, hexToArrayBuffer, randomBytes} from "ferrum-crypto";
// @ts-ignore
import {publicKeyCreate} from 'hdkey/lib/secp256k1';
import {NetworkStage} from "../types";

export class BitcoinAddress implements CreateNewAddress, Injectable {
  private addressGen: AddressFromPublicKey;
  private readonly network: Network;
  constructor(networkStage: NetworkStage) {
    this.addressGen = new AddressFromPublicKey();
    this.network = networkStage === 'test' ? 'BITCOIN_TESTNET' : 'BITCOIN';
  }

  __name__(): string { return 'BitcoinAddress'; }

  async addressFromSk(sk: string): Promise<AddressWithSecretKeys> {
    const pubkU = arrayBufferToHex(publicKeyCreate(hexToArrayBuffer(sk), false));
    const pubk = arrayBufferToHex(publicKeyCreate(hexToArrayBuffer(sk), true));
    const addr =  this.addressGen.forNetwork(this.network, pubk, pubkU);
    return {
      address: addr.addressWithChecksum,
      createdAt: Date.now(),
      network: this.network,
      privateKeyHex: sk,
    } as AddressWithSecretKeys;
  }

  newAddress(): Promise<AddressWithSecretKeys> {
    return this.addressFromSk(randomBytes(32));
  }
}