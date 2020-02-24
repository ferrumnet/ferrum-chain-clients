import {EthereumClient} from "../EthereumClient";
import {MultiChainConfig, NetworkStage} from "../types";
import {GasPriceProvider} from "../GasPriceProvider";
import {Erc20ReaderClient} from "./Erc20ReaderClient";
import {LocalCache} from "ferrum-plumbing";

export class FullEthereumClient extends EthereumClient {
  private readonly decimalsCache: LocalCache;
  public constructor(networkStage: NetworkStage, config: MultiChainConfig, gasService: GasPriceProvider) {
    super(networkStage, config, gasService);
    this.decimalsCache = new LocalCache();
  }

  protected async getTokenDecimals(tok: string): Promise<number> {
    return this.decimalsCache.getAsync(tok, async () => {
      const client = new Erc20ReaderClient(this, tok);
      try {
        return await client.decimals();
      } catch (e) {
        if (e.toString().indexOf('eturned values aren\'t valid')) {
          return 0;
        }
        console.warn('Error calling decimal on contract', tok, e);
        throw e;
      }
    });
  }
}