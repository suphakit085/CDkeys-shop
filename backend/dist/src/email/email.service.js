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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = __importStar(require("nodemailer"));
let EmailService = EmailService_1 = class EmailService {
    logger = new common_1.Logger(EmailService_1.name);
    transporter = null;
    constructor() {
        this.initializeTransporter();
    }
    initializeTransporter() {
        const host = process.env.SMTP_HOST;
        const port = parseInt(process.env.SMTP_PORT || '587');
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        if (!host || !user || !pass) {
            this.logger.warn('SMTP not configured - email sending disabled');
            return;
        }
        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
        });
        this.logger.log(`Email service initialized with SMTP host: ${host}`);
    }
    isConfigured() {
        return this.transporter !== null;
    }
    async sendCdKeysEmail(order) {
        if (!this.transporter) {
            this.logger.warn('Email not configured - skipping CD key delivery email');
            return false;
        }
        const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
        const storeName = process.env.STORE_NAME || 'DGK Marketplace';
        const keysHtml = order.items.map(item => `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                    <strong>${item.gameTitle}</strong><br>
                    <span style="color: #6b7280; font-size: 14px;">${item.platform}</span>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 16px; background-color: #f3f4f6; border-radius: 4px;">
                    ${item.cdKey}
                </td>
            </tr>
        `).join('');
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Your CD Keys</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h1 style="color: #7c3aed; margin: 0 0 24px 0; text-align: center;">
                    🎮 ${storeName}
                </h1>
                
                <div style="background: linear-gradient(135deg, #7c3aedff 0%, #a855f7 100%); color: white; padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
                    <h2 style="margin: 0; font-size: 20px;">✅ การชำระเงินสำเร็จ!</h2>
                </div>
                
                <p style="color: #374151;">สวัสดีคุณ <strong>${order.customerName || 'ลูกค้า'}</strong>,</p>
                
                <p style="color: #374151;">ขอบคุณสำหรับการสั่งซื้อ! นี่คือ CD Keys ของคุณ:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="padding: 12px; text-align: left; color: #374151;">เกม</th>
                            <th style="padding: 12px; text-align: left; color: #374151;">CD Key</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${keysHtml}
                    </tbody>
                </table>
                
                <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;">
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                        <strong>⚠️ สำคัญ:</strong> กรุณาเก็บรักษา CD Keys เหล่านี้ไว้อย่างปลอดภัย อย่าแชร์กับผู้อื่น
                    </p>
                </div>
                
                <p style="color: #374151;">
                    เลขที่คำสั่งซื้อ: <strong>#${order.orderId.slice(0, 8).toUpperCase()}</strong><br>
                    ยอดรวม: <strong>฿${order.total.toFixed(2)}</strong>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                
                <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">
                    หากมีคำถามหรือต้องการความช่วยเหลือ กรุณาติดต่อเรา<br>
                    ขอบคุณที่ใช้บริการ ${storeName} 
                </p>
            </div>
        </body>
        </html>
        `;
        try {
            await this.transporter.sendMail({
                from: `"${storeName}" <${fromEmail}>`,
                to: order.customerEmail,
                subject: `🎮 CD Keys ของคุณพร้อมแล้ว! - Order #${order.orderId.slice(0, 8).toUpperCase()}`,
                html,
            });
            this.logger.log(`CD Keys email sent to ${order.customerEmail} for order ${order.orderId}`);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to send email to ${order.customerEmail}:`, error);
            return false;
        }
    }
    async sendPasswordResetEmail(email, resetToken, userName) {
        if (!this.transporter) {
            this.logger.warn('Email not configured - skipping password reset email');
            return false;
        }
        const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
        const storeName = process.env.STORE_NAME || 'CD Keys Marketplace';
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetLink = `${frontendUrl}/reset-password/${resetToken}`;
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Reset Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h1 style="color: #7c3aed; margin: 0 0 24px 0; text-align: center;">
                    🔐 ${storeName}
                </h1>
                
                <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
                    <h2 style="margin: 0; font-size: 20px;">รีเซ็ตรหัสผ่าน</h2>
                </div>
                
                <p style="color: #374151;">สวัสดีคุณ <strong>${userName}</strong>,</p>
                
                <p style="color: #374151;">เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ คลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่:</p>
                
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                        รีเซ็ตรหัสผ่าน
                    </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">หรือคัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:</p>
                <p style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; word-break: break-all; font-size: 14px; color: #4b5563;">
                    ${resetLink}
                </p>
                
                <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;">
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                        <strong>⚠️ สำคัญ:</strong> ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง<br>
                        หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยอีเมลนี้
                    </p>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                
                <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">
                    ขอบคุณที่ใช้บริการ ${storeName} 🎉
                </p>
            </div>
        </body>
        </html>
        `;
        try {
            await this.transporter.sendMail({
                from: `"${storeName}" <${fromEmail}>`,
                to: email,
                subject: `🔐 รีเซ็ตรหัสผ่าน - ${storeName}`,
                html,
            });
            this.logger.log(`Password reset email sent to ${email}`);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to send password reset email to ${email}:`, error);
            return false;
        }
    }
    async sendMagicLinkEmail(email, magicToken, userName) {
        if (!this.transporter) {
            this.logger.warn('Email not configured - skipping magic link email');
            return false;
        }
        const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
        const storeName = process.env.STORE_NAME || 'CD Keys Marketplace';
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const magicLink = `${frontendUrl}/magic-login/${magicToken}`;
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Magic Link Login</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h1 style="color: #7c3aed; margin: 0 0 24px 0; text-align: center;">
                    ✨ ${storeName}
                </h1>
                
                <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
                    <h2 style="margin: 0; font-size: 20px;">ล็อกอินด้วยคลิกเดียว</h2>
                </div>
                
                <p style="color: #374151;">สวัสดีคุณ <strong>${userName}</strong>,</p>
                
                <p style="color: #374151;">คลิกปุ่มด้านล่างเพื่อล็อกอินเข้าสู่ระบบโดยไม่ต้องพิมพ์รหัสผ่าน:</p>
                
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                        🚀 ล็อกอินทันที
                    </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">หรือคัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:</p>
                <p style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; word-break: break-all; font-size: 14px; color: #4b5563;">
                    ${magicLink}
                </p>
                
                <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;">
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                        <strong>⚠️ สำคัญ:</strong> ลิงก์นี้จะหมดอายุใน 15 นาที<br>
                        หากคุณไม่ได้ขอล็อกอิน กรุณาเพิกเฉยอีเมลนี้
                    </p>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                
                <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">
                    ขอบคุณที่ใช้บริการ ${storeName} 🎉
                </p>
            </div>
        </body>
        </html>
        `;
        try {
            await this.transporter.sendMail({
                from: `"${storeName}" <${fromEmail}>`,
                to: email,
                subject: `✨ ลิงก์ล็อกอินของคุณ - ${storeName}`,
                html,
            });
            this.logger.log(`Magic link email sent to ${email}`);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to send magic link email to ${email}:`, error);
            return false;
        }
    }
    async sendRegistrationMagicLinkEmail(email, magicToken, userName) {
        if (!this.isConfigured()) {
            this.logger.warn('Email not configured, skipping registration magic link email');
            return false;
        }
        const storeName = process.env.STORE_NAME || 'CD Keys Marketplace';
        const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const verifyLink = `${frontendUrl}/magic-login/${magicToken}`;
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>ยินดีต้อนรับ</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h1 style="color: #7c3aed; margin: 0 0 24px 0; text-align: center;">
                    🎮 ${storeName}
                </h1>
                
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
                    <h2 style="margin: 0; font-size: 20px;">🎉 ยินดีต้อนรับ!</h2>
                </div>
                
                <p style="color: #374151;">สวัสดีคุณ <strong>${userName}</strong>,</p>
                
                <p style="color: #374151;">ขอบคุณที่สมัครใช้งาน ${storeName}! คลิกปุ่มด้านล่างเพื่อเปิดใช้งานบัญชีและเริ่มช้อปปิ้ง:</p>
                
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${verifyLink}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                        🚀 เปิดใช้งานบัญชี
                    </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">หรือคัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:</p>
                <p style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; word-break: break-all; font-size: 14px; color: #4b5563;">
                    ${verifyLink}
                </p>
                
                <div style="background-color: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 24px 0;">
                    <p style="margin: 0; color: #1e40af; font-size: 14px;">
                        <strong>ℹ️ หมายเหตุ:</strong> ลิงก์นี้จะหมดอายุใน 24 ชั่วโมง<br>
                        หลังจากเปิดใช้งานแล้ว คุณสามารถตั้งรหัสผ่านได้ในหน้าโปรไฟล์
                    </p>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                
                <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">
                    ขอบคุณที่ใช้บริการ ${storeName} 🎉
                </p>
            </div>
        </body>
        </html>
        `;
        try {
            await this.transporter.sendMail({
                from: `"${storeName}" <${fromEmail}>`,
                to: email,
                subject: `🎉 ยินดีต้อนรับสู่ ${storeName} - เปิดใช้งานบัญชีของคุณ`,
                html,
            });
            this.logger.log(`Registration magic link email sent to ${email}`);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to send registration magic link email to ${email}:`, error);
            return false;
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EmailService);
//# sourceMappingURL=email.service.js.map