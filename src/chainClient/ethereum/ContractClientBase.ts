import {EthereumClient} from '../EthereumClient';
import * as abi from '../../resources/erc20-abi.json';

export abstract class ContractClientBase {
    protected constructor(protected readonly client: EthereumClient,
                          protected readonly contract: string,
                          protected readonly abi: Object) {
    }

    protected async call(methodFun: (m: any) => any, ) {
        const web3 = this.web3();
        let erc20Contract = new web3.eth.Contract(abi.abi as any, this.contract);
        return await methodFun(erc20Contract.methods).call();
    }

    protected async estimateGas(from: string, methodFun: (m: any) => any) {
        try {
            const web3 = this.web3();
            let erc20Contract = new web3.eth.Contract(abi.abi as any, this.contract);
            return await methodFun(erc20Contract.methods).estimateGas({from});
        } catch(e) {
            return 0; // Could not estimate the gas
        }
    }

    protected web3() {
        return this.client.web3();
    }
}
