"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const RemoteSignerClient_1 = require("./RemoteSignerClient");
const ferrum_plumbing_1 = require("ferrum-plumbing");
const ferrum_crypto_1 = require("ferrum-crypto");
test('can sign remotely', function () {
    return __awaiter(this, void 0, void 0, function* () {
        jest.setTimeout(1000000);
        const rpc = new ferrum_plumbing_1.JsonRpcClient(process.env.TEST_SIGNER_ENDPOINT, '', '', new ferrum_plumbing_1.SecretAuthProvider('TEST_SECRET'));
        const signer = new RemoteSignerClient_1.RemoteSignerClient(rpc, 'ETHEREUM');
        const data = ferrum_crypto_1.sha256sync(Buffer.from('Some data to sign', 'utf-8').toString('hex'));
        const res = yield signer.sign(process.env.TEST_SIGNER_ADDRESS, data, false);
        console.log(res);
        expect(res.r).toBeTruthy();
        expect(res.s).toBeTruthy();
        expect(res.v).toBeTruthy();
    });
});
//# sourceMappingURL=RemoteSignerClient.test.js.map