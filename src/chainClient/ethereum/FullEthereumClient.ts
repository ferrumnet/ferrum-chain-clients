import {EthereumClient} from "../EthereumClient";
import {MultiChainConfig, NetworkStage} from "../types";
import {GasPriceProvider} from "../GasPriceProvider";
import {Erc20ReaderClient} from "./Erc20ReaderClient";
import {LocalCache, LoggerFactory, ValidationUtils} from "ferrum-plumbing";

export class FullEthereumClient extends EthereumClient {
  private readonly decimalsCache: LocalCache;
  public constructor(networkStage: NetworkStage, config: MultiChainConfig,
    gasService: GasPriceProvider, logFac: LoggerFactory) {
    super(networkStage, config, gasService, logFac);
    this.decimalsCache = new LocalCache();
  }

  protected async getTokenDecimals(tok: string): Promise<number> {
    ValidationUtils.isTrue(!tok, "'tok' cannot be empty");
    return this.decimalsCache.getAsync(tok, async () => {
      const client = new Erc20ReaderClient(this, tok);
      try {
        return await client.decimals();
      } catch (e) {
        if (e.toString().indexOf('eturned values aren\'t valid')) {
          console.warn('Returning zero for decimal. ', tok, e);
          return 0;
        }
        console.warn('Error calling decimal on contract', tok, e);
        throw e;
      }
    });
  }
}