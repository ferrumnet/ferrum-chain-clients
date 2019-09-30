import {EthereumClient} from '../EthereumClient';
import * as abi from '../../resources/erc20-abi.json';
import {ContractClientBase} from './ContractClientBase';
import {TypeUtils} from 'ferrum-plumbing';

export class Erc20ReaderClient extends ContractClientBase {
    private _decimals: number | undefined;
    private _name: string | undefined;
    private _totalSupply: number | undefined;
    private _symbol: string | undefined;

    constructor(client: EthereumClient, contract: string) {
        super(client, contract, abi.abi);
    }

    async decimals(): Promise<number> {
        return TypeUtils.meomize<number>(this, '_decimals', () => this.call(m => m.decimals()));
    }

    async name(): Promise<string> {
        return TypeUtils.meomize<number>(this, '_name', () => this.call(m => m.name()));
    }

    async symbol(): Promise<string> {
        return TypeUtils.meomize<number>(this, '_symbol', () => this.call(m => m.symbol()));
    }

    async totalSupply(): Promise<number> {
        const total = await TypeUtils.meomize<number>(this, '_totalSupply',
            () => this.call(m => m.totalSupply()));
        return (await this.rawToAmount(total))!;
    }

    public async balanceOf(address: string): Promise<number|undefined> {
        const bal = await this.call(m => m.balanceOf(address));
        return this.rawToAmount(bal);
    }

    public async allowance(owner: string, spender: string): Promise<number|undefined> {
        const allow = await this.call(m => m.allowance(owner, spender));
        return this.rawToAmount(allow);
    }

    private async rawToAmount(raw?: number) {
        if (!raw) {
            return undefined;
        }
        const decimals = await this.decimals();
        return raw / (Math.pow(10, decimals));
    }

    private async amountToRaw(amount?: number) {
        if (!amount) {
            return undefined;
        }
        const decimals = await this.decimals();
        return amount * (Math.pow(10, decimals));
    }
}
