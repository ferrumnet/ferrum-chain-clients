import { EthereumClient } from '../EthereumClient';
import { ContractClientBase } from './ContractClientBase';
export declare class Erc20ReaderClient extends ContractClientBase {
    private _decimals;
    private _name;
    private _totalSupply;
    private _symbol;
    constructor(client: EthereumClient, contract: string);
    decimals(): Promise<number>;
    name(): Promise<string>;
    symbol(): Promise<string>;
    totalSupply(): Promise<number>;
    balanceOf(address: string): Promise<number | undefined>;
    allowance(owner: string, spender: string): Promise<number | undefined>;
    private rawToAmount;
    private amountToRaw;
}
//# sourceMappingURL=Erc20ReaderClient.d.ts.map