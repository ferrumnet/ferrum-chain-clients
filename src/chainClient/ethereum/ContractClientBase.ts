import {EthereumClient} from '../EthereumClient';
import * as abi from '../../resources/erc20-abi.json';
import Web3 from 'web3';

export abstract class ContractClientBase {
    private _web3: Web3 | undefined;
    protected constructor(protected readonly client: EthereumClient,
                          protected readonly contract: string,
                          protected readonly abi: Object) {
    }

    protected async call(methodFun: (m: any) => any, ) {
        const web3 = this.web3();
        let erc20Contract = new web3.eth.Contract(abi.abi, this.contract);
        return await methodFun(erc20Contract.methods).call();
    }

    protected web3() {
        if (!this._web3) {
            this._web3 = this.client.web3();
        }
        return this._web3!;
    }
}
