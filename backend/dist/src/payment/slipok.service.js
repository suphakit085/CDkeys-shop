"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var SlipOkService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlipOkService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let SlipOkService = SlipOkService_1 = class SlipOkService {
    logger = new common_1.Logger(SlipOkService_1.name);
    apiKey = process.env.SLIPOK_API_KEY;
    branchId = process.env.SLIPOK_BRANCH_ID;
    async verifySlip(slipPath) {
        this.logger.log(`SlipOK Config - API Key: ${this.apiKey ? 'SET (length: ' + this.apiKey.length + ')' : 'NOT SET'}, Branch ID: ${this.branchId || 'NOT SET'}`);
        if (!this.apiKey || !this.branchId) {
            this.logger.warn('SlipOK API not configured - skipping auto verification');
            return { success: false, message: 'SlipOK API not configured' };
        }
        const fullPath = path.join(process.cwd(), slipPath);
        this.logger.log(`Checking slip file at: ${fullPath}`);
        if (!fs.existsSync(fullPath)) {
            this.logger.error(`Slip file not found: ${fullPath}`);
            return { success: false, message: 'Slip file not found' };
        }
        try {
            const fileBuffer = fs.readFileSync(fullPath);
            const base64Data = fileBuffer.toString('base64');
            const ext = path.extname(slipPath).toLowerCase();
            const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
            const dataUrl = `data:${mimeType};base64,${base64Data}`;
            this.logger.log(`Calling SlipOK API for branch: ${this.branchId}, file size: ${fileBuffer.length} bytes`);
            const response = await fetch(`https://api.slipok.com/api/line/apikey/${this.branchId}`, {
                method: 'POST',
                headers: {
                    'x-authorization': this.apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: dataUrl,
                    log: true,
                }),
            });
            const result = await response.json();
            this.logger.log(`SlipOK Response status: ${response.status}, success: ${result.success}, message: ${result.message}`);
            if (result.data) {
                this.logger.log(`SlipOK Data: amount=${JSON.stringify(result.data.amount)}, transRef=${result.data.transRef}`);
            }
            if (!response.ok || !result.success) {
                this.logger.warn(`SlipOK verification failed: ${result.message || JSON.stringify(result)}`);
                return {
                    success: false,
                    message: result.message || 'Verification failed'
                };
            }
            const data = result.data;
            const amount = parseFloat(data.amount?.amount || data.amount || '0');
            this.logger.log(`Parsed amount: ${amount}`);
            return {
                success: true,
                amount: amount,
                transRef: data.transRef,
                sendingBank: data.sendingBank,
                receivingBank: data.receivingBank,
                transDate: data.transDate,
                transTime: data.transTime,
                sender: data.sender,
                receiver: data.receiver,
            };
        }
        catch (error) {
            this.logger.error('SlipOK API error:', error);
            return { success: false, message: 'API request failed' };
        }
    }
    isConfigured() {
        return false;
    }
};
exports.SlipOkService = SlipOkService;
exports.SlipOkService = SlipOkService = SlipOkService_1 = __decorate([
    (0, common_1.Injectable)()
], SlipOkService);
//# sourceMappingURL=slipok.service.js.map