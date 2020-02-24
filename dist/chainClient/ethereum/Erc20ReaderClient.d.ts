import { EthereumClient } from '../EthereumClient';
import { ContractClientBase } from './ContractClientBase';
import { Injectable } from 'ferrum-plumbing';
export declare class Erc20ReaderClient extends ContractClientBase implements Injectable {
    private _decimals;
    private _name;
    private _totalSupply;
    private _symbol;
    constructor(client: EthereumClient, contract: string);
    __name__(): string;
    decimals(): Promise<number>;
    name(): Promise<string>;
    symbol(): Promise<string>;
    totalSupply(): Promise<string>;
    balanceOf(address: string): Promise<string | undefined>;
    allowance(owner: string, spender: string): Promise<string | undefined>;
    private rawToAmount;
    private amountToRaw;
}
//# sourceMappingURL=Erc20ReaderClient.d.ts.map