export interface SlipVerificationResult {
    success: boolean;
    message?: string;
    amount?: number;
    transRef?: string;
    sendingBank?: string;
    receivingBank?: string;
    transDate?: string;
    transTime?: string;
    sender?: {
        name?: string;
    };
    receiver?: {
        name?: string;
    };
}
export declare class SlipOkService {
    private readonly logger;
    private readonly apiKey;
    private readonly branchId;
    verifySlip(slipPath: string): Promise<SlipVerificationResult>;
    isConfigured(): boolean;
}
