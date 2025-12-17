import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface SlipVerificationResult {
    success: boolean;
    message?: string;
    amount?: number;
    transRef?: string;
    sendingBank?: string;
    receivingBank?: string;
    transDate?: string;
    transTime?: string;
    sender?: { name?: string };
    receiver?: { name?: string };
}

@Injectable()
export class SlipOkService {
    private readonly logger = new Logger(SlipOkService.name);
    private readonly apiKey = process.env.SLIPOK_API_KEY;
    private readonly branchId = process.env.SLIPOK_BRANCH_ID;

    async verifySlip(slipPath: string): Promise<SlipVerificationResult> {
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
            // Read file as base64 and send as data URL
            const fileBuffer = fs.readFileSync(fullPath);
            const base64Data = fileBuffer.toString('base64');
            const ext = path.extname(slipPath).toLowerCase();
            const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
            const dataUrl = `data:${mimeType};base64,${base64Data}`;

            this.logger.log(`Calling SlipOK API for branch: ${this.branchId}, file size: ${fileBuffer.length} bytes`);

            const response = await fetch(
                `https://api.slipok.com/api/line/apikey/${this.branchId}`,
                {
                    method: 'POST',
                    headers: {
                        'x-authorization': this.apiKey,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        url: dataUrl,
                        log: true,
                    }),
                }
            );

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
        } catch (error) {
            this.logger.error('SlipOK API error:', error);
            return { success: false, message: 'API request failed' };
        }
    }

    isConfigured(): boolean {
        // TODO: SlipOK disabled - re-enable when API key is working
        return false;
    }
}
