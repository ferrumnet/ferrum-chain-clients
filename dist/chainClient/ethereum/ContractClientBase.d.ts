import { EthereumClient } from '../EthereumClient';
import Web3 from 'web3';
export declare abstract class ContractClientBase {
    protected readonly client: EthereumClient;
    protected readonly contract: string;
    protected readonly abi: Object;
    private _web3;
    protected constructor(client: EthereumClient, contract: string, abi: Object);
    protected call(methodFun: (m: any) => any): Promise<any>;
    protected web3(): Web3;
}
//# sourceMappingURL=ContractClientBase.d.ts.map