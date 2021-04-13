import {EthereumClient} from "../EthereumClient";
import {MultiChainConfig, NetworkStage} from "../types";
import {GasPriceProvider} from "../GasPriceProvider";
import {Erc20ReaderClient} from "./Erc20ReaderClient";
import {LocalCache, LoggerFactory, Network, ValidationUtils} from "ferrum-plumbing";

export class FullEthereumClient extends EthereumClient {
  private readonly clientCache: LocalCache;
  private readonly decimalsCache: LocalCache;
  public constructor(net: Network, config: MultiChainConfig,
    gasService: GasPriceProvider, logFac: LoggerFactory) {
    super(net, config, gasService, logFac);
    this.clientCache = new LocalCache();
    this.decimalsCache = new LocalCache();
  }

  protected async getTokenDecimals(tok: string): Promise<number> {
    ValidationUtils.isTrue(!!tok, "'tok' cannot be empty");
    return this.decimalsCache.getAsync(tok, async () => {
      try {
        const client = await this.getClient(tok);
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

  private async getClient(tok: string) {
        return await this.clientCache.getAsync(tok, async () => {
          return new Erc20ReaderClient(this, tok);
        });
  }

  protected async erc20GasLimit(currency: string, from: string, to: string, amount: string): Promise<number> {
    const tok = currency.split(':')[1];
    const client = await this.getClient(tok);
    return (await client.estimateTransferGas(from, to, amount)) || 0;
  }
}