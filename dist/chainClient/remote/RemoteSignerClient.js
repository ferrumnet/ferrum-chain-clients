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
const ferrum_plumbing_1 = require("ferrum-plumbing");
class RemoteSignerClient {
    constructor(api) {
        this.api = api;
    }
    /**
     * Remotely signs a transaction.
     * @param skHex Must be empty string
     * @param data Data to sign as Hex
     * @param forceLow Force low
     */
    sign(skHex, data, forceLow) {
        return __awaiter(this, void 0, void 0, function* () {
            ferrum_plumbing_1.ValidationUtils.isTrue(!skHex || skHex === RemoteSignerClient.DUMMY_PRIVATE_KEY, 'skHex must be empty. We are signing remotely');
            const res = yield this.api.call({
                command: 'sign',
                params: [data, forceLow],
            });
            return res.data;
        });
    }
    __name__() { return 'RemoteSignerClient'; }
}
exports.RemoteSignerClient = RemoteSignerClient;
RemoteSignerClient.DUMMY_PRIVATE_KEY = 'DUMMY_PRIVATE_KEY';
//# sourceMappingURL=RemoteSignerClient.js.map