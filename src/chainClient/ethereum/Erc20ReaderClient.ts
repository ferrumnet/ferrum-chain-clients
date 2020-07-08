import {EthereumClient} from '../EthereumClient';
import * as abi from '../../resources/erc20-abi.json';
import {ContractClientBase} from './ContractClientBase';
import {Injectable, TypeUtils, ValidationUtils} from 'ferrum-plumbing';
import {ChainUtils} from "../ChainUtils";

export class Erc20ReaderClient extends ContractClientBase implements Injectable {
    private _decimals: number | undefined;
    private _name: string | undefined;
    private _totalSupply: number | undefined;
    private _symbol: string | undefined;

    constructor(client: EthereumClient, contract: string) {
        super(client, contract, abi.abi);
    }

    __name__(): string { return 'Erc20ReaderClient'; }

    async decimals(): Promise<number> {
        return TypeUtils.meomize<number>(this, '_decimals', async () => {
            const dec =await this.call(m => m.decimals());
            ValidationUtils.isTrue(dec !== undefined, 'Could not read "decimals" for ' + this.contract);
            return dec;
        });
    }

    async name(): Promise<string> {
        return TypeUtils.meomize<number>(this, '_name', () => this.call(m => m.name()));
    }

    async symbol(): Promise<string> {
        return TypeUtils.meomize<number>(this, '_symbol', () => this.call(m => m.symbol()));
    }

    async totalSupply(): Promise<string> {
        const total = await TypeUtils.meomize<number>(this, '_totalSupply',
            () => this.call(m => m.totalSupply()));
        return (await this.rawToAmount(total))!;
    }

    public async balanceOf(address: string): Promise<string|undefined> {
        const bal = await this.call(m => m.balanceOf(address));
        return this.rawToAmount(bal);
    }

    public async allowance(owner: string, spender: string): Promise<string|undefined> {
        const allow = await this.call(m => m.allowance(owner, spender));
        return this.rawToAmount(allow);
    }

    private async rawToAmount(raw?: string) {
            if (!raw) {
                return undefined;
            }
            const decimals = await this.decimals();
            return ChainUtils.toDecimalStr(raw, decimals);
        }

    private async amountToRaw(amount?: string) {
            if (!amount) {
                return undefined;
            }
            const decimals = await this.decimals();
            return ChainUtils.toBigIntStr(amount, decimals);
        }
    }
