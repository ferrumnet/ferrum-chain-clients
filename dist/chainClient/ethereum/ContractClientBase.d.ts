import { EthereumClient } from '../EthereumClient';
export declare abstract class ContractClientBase {
    protected readonly client: EthereumClient;
    protected readonly contract: string;
    protected readonly abi: Object;
    protected constructor(client: EthereumClient, contract: string, abi: Object);
    protected call(methodFun: (m: any) => any): Promise<any>;
    protected web3(): import("web3").default;
}
//# sourceMappingURL=ContractClientBase.d.ts.map