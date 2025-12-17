export declare class RequestPasswordResetDto {
    email: string;
}
export declare class ResetPasswordDto {
    token: string;
    newPassword: string;
}
export declare class RequestMagicLinkDto {
    email: string;
}
export declare class VerifyMagicLinkDto {
    token: string;
}
export declare class MagicLinkRegisterDto {
    email: string;
    name: string;
}
