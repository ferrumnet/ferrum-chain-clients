import {RemoteSignerClient} from "./RemoteSignerClient";
import {JsonRpcClient, SecretAuthProvider} from "ferrum-plumbing";
import {sha256sync} from "ferrum-crypto";

test('can sign remotely', async function() {
   jest.setTimeout(1000000);
   const rpc = new JsonRpcClient(process.env.TEST_SIGNER_ENDPOINT!, '', '',
       new SecretAuthProvider('TEST_SECRET'));
   const signer = new RemoteSignerClient(rpc);
   const data = sha256sync(Buffer.from('Some data to sign', 'utf-8').toString('hex'));
   const res = await signer.sign('ETHEREUM', process.env.TEST_SIGNER_ADDRESS!, data, false);
   console.log(res);
   expect(res.r).toBeTruthy();
   expect(res.s).toBeTruthy();
   expect(res.v).toBeTruthy();
});
