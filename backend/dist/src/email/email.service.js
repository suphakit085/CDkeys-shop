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
const env_1 = require("../common/env");
let EmailService = EmailService_1 = class EmailService {
    logger = new common_1.Logger(EmailService_1.name);
    transporter = null;
    resendApiKey = null;
    useResend = false;
    constructor() {
        this.initializeTransporter();
    }
    initializeTransporter() {
        const resendKey = process.env.RESEND_API_KEY;
        if ((0, env_1.isConfiguredValue)(resendKey)) {
            this.resendApiKey = resendKey;
            this.useResend = true;
            this.logger.log('Email service initialized with Resend API');
            return;
        }
        const host = process.env.SMTP_HOST;
        const port = parseInt(process.env.SMTP_PORT || '587');
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        if (!(0, env_1.isConfiguredSet)(host, user, pass)) {
            this.logger.warn('Email not configured - email sending disabled');
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
        return this.transporter !== null || this.useResend;
    }
    async sendWithResend(to, subject, html) {
        if (!this.resendApiKey)
            return false;
        const fromEmail = process.env.SMTP_FROM || 'onboarding@resend.dev';
        try {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.resendApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: fromEmail,
                    to: [to],
                    subject: subject,
                    html: html,
                }),
            });
            if (response.ok) {
                this.logger.log(`Email sent via Resend to ${to}`);
                return true;
            }
            else {
                const error = await response.json();
                this.logger.error(`Resend API error: ${JSON.stringify(error)}`);
                return false;
            }
        }
        catch (error) {
            this.logger.error(`Resend API request failed: ${error}`);
            return false;
        }
    }
    async sendEmail(to, subject, html) {
        if (this.useResend) {
            return this.sendWithResend(to, subject, html);
        }
        if (!this.transporter)
            return false;
        const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
        try {
            await this.transporter.sendMail({
                from: fromEmail,
                to: to,
                subject: subject,
                html: html,
            });
            this.logger.log(`Email sent via SMTP to ${to}`);
            return true;
        }
        catch (error) {
            this.logger.error(`SMTP send failed: ${error}`);
            return false;
        }
    }
    async sendCdKeysEmail(order) {
        if (!this.isConfigured()) {
            this.logger.warn('Email not configured - skipping CD key delivery email');
            return false;
        }
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
            const subject = `🎮 CD Keys ของคุณพร้อมแล้ว! - Order #${order.orderId.slice(0, 8).toUpperCase()}`;
            const result = await this.sendEmail(order.customerEmail, subject, html);
            if (result) {
                this.logger.log(`CD Keys email sent to ${order.customerEmail} for order ${order.orderId}`);
            }
            return result;
        }
        catch (error) {
            this.logger.error(`Failed to send email to ${order.customerEmail}:`, error);
            return false;
        }
    }
    async sendPasswordResetEmail(email, resetToken, userName) {
        if (!this.isConfigured()) {
            this.logger.warn('Email not configured - skipping password reset email');
            return false;
        }
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
            const subject = `🔐 รีเซ็ตรหัสผ่าน - ${storeName}`;
            const result = await this.sendEmail(email, subject, html);
            if (result) {
                this.logger.log(`Password reset email sent to ${email}`);
            }
            return result;
        }
        catch (error) {
            this.logger.error(`Failed to send password reset email to ${email}:`, error);
            return false;
        }
    }
    async sendMagicLinkEmail(email, magicToken, userName) {
        if (!this.isConfigured()) {
            this.logger.warn('Email not configured - skipping magic link email');
            return false;
        }
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
            const subject = `✨ ลิงก์ล็อกอินของคุณ - ${storeName}`;
            const result = await this.sendEmail(email, subject, html);
            if (result) {
                this.logger.log(`Magic link email sent to ${email}`);
            }
            return result;
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
            const subject = `🎉 ยินดีต้อนรับสู่ ${storeName} - เปิดใช้งานบัญชีของคุณ`;
            const result = await this.sendEmail(email, subject, html);
            if (result) {
                this.logger.log(`Registration magic link email sent to ${email}`);
            }
            return result;
        }
        catch (error) {
            this.logger.error(`Failed to send registration magic link email to ${email}:`, error);
            return false;
        }
    }
    async sendNewOrderNotification(order) {
        if (!this.isConfigured()) {
            this.logger.warn('Email not configured - skipping order notification');
            return false;
        }
        const storeEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
        const storeName = process.env.STORE_NAME || 'CD Keys Marketplace';
        if (!storeEmail) {
            this.logger.warn('Store email not configured');
            return false;
        }
        const itemsHtml = order.items.map(item => `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                    <strong>${item.gameTitle}</strong>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                    ${item.platform}
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-family: monospace;">
                    ${item.cdKey}
                </td>
            </tr>
        `).join('');
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>คำสั่งซื้อใหม่</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h1 style="color: #059669; margin: 0 0 24px 0; text-align: center;">
                    💰 ${storeName}
                </h1>
                
                <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
                    <h2 style="margin: 0; font-size: 20px;">🔔 คำสั่งซื้อใหม่!</h2>
                </div>
                
                <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                    <p style="margin: 0; color: #166534;"><strong>Order ID:</strong> ${order.orderId}</p>
                    <p style="margin: 8px 0 0 0; color: #166534;"><strong>ลูกค้า:</strong> ${order.customerName}</p>
                    <p style="margin: 8px 0 0 0; color: #166534;"><strong>อีเมล:</strong> ${order.customerEmail}</p>
                </div>
                
                <h3 style="color: #374151; margin-bottom: 16px;">รายการสินค้า:</h3>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">เกม</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">แพลตฟอร์ม</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">CD Key</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                
                <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 16px; border-radius: 8px; text-align: center;">
                    <p style="margin: 0; font-size: 18px;">💵 ยอดรวม: <strong>฿${order.total.toFixed(2)}</strong></p>
                </div>
                
                <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>อีเมลนี้ส่งอัตโนมัติจากระบบ ${storeName}</p>
                    <p>เวลา: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</p>
                </div>
            </div>
        </body>
        </html>
        `;
        try {
            const storeEmail = process.env.SMTP_FROM || 'admin@cdkeys.com';
            const subject = `🔔 คำสั่งซื้อใหม่! - Order #${order.orderId.slice(-8).toUpperCase()} - ฿${order.total.toFixed(2)}`;
            const result = await this.sendEmail(storeEmail, subject, html);
            if (result) {
                this.logger.log(`New order notification sent to store: ${storeEmail}`);
            }
            return result;
        }
        catch (error) {
            this.logger.error(`Failed to send order notification:`, error);
            return false;
        }
    }
    async sendPendingPaymentNotification(order) {
        if (!this.isConfigured()) {
            this.logger.warn('Email not configured - skipping pending payment notification');
            return false;
        }
        const storeEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
        const storeName = process.env.STORE_NAME || 'CD Keys Marketplace';
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        if (!storeEmail) {
            this.logger.warn('Store email not configured');
            return false;
        }
        const itemsHtml = order.items.map(item => `
            <li style="padding: 8px 0; border-bottom: 1px solid #fef3c7;">
                <strong>${item.gameTitle}</strong> - ${item.platform}
            </li>
        `).join('');
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>รอตรวจสอบการชำระเงิน</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h1 style="color: #d97706; margin: 0 0 24px 0; text-align: center;">
                    ⏳ ${storeName}
                </h1>
                
                <div style="background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); color: white; padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
                    <h2 style="margin: 0; font-size: 20px;">🔔 รอตรวจสอบการชำระเงิน!</h2>
                </div>
                
                <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                    <p style="margin: 0; color: #92400e;"><strong>⚠️ มีลูกค้าอัพโหลดสลิปใหม่!</strong></p>
                    <p style="margin: 8px 0 0 0; color: #92400e;">กรุณาตรวจสอบและอนุมัติเพื่อส่ง CD Keys ให้ลูกค้า</p>
                </div>
                
                <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                    <p style="margin: 0; color: #374151;"><strong>Order ID:</strong> ${order.orderId}</p>
                    <p style="margin: 8px 0 0 0; color: #374151;"><strong>ลูกค้า:</strong> ${order.customerName}</p>
                    <p style="margin: 8px 0 0 0; color: #374151;"><strong>อีเมล:</strong> ${order.customerEmail}</p>
                    <p style="margin: 8px 0 0 0; color: #374151;"><strong>ยอดรวม:</strong> <span style="color: #059669; font-weight: bold;">฿${order.total.toFixed(2)}</span></p>
                </div>
                
                <h3 style="color: #374151; margin-bottom: 12px;">📦 รายการสินค้า:</h3>
                <ul style="list-style: none; padding: 0; margin: 0 0 24px 0; background-color: #fffbeb; border-radius: 8px; overflow: hidden;">
                    ${itemsHtml}
                </ul>
                
                <div style="text-align: center; margin-bottom: 24px;">
                    <p style="color: #6b7280; margin-bottom: 16px;">📎 สลิปการชำระเงิน:</p>
                    <a href="${order.slipUrl}" style="display: inline-block; color: #7c3aed; text-decoration: underline;">ดูสลิป</a>
                </div>
                
                <div style="text-align: center;">
                    <a href="${frontendUrl}/admin/verify-payments" style="display: inline-block; background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                        ✅ ไปตรวจสอบเลย
                    </a>
                </div>
                
                <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>อีเมลนี้ส่งอัตโนมัติจากระบบ ${storeName}</p>
                    <p>เวลา: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</p>
                </div>
            </div>
        </body>
        </html>
        `;
        try {
            const subject = `⏳ รอตรวจสอบ! - Order #${order.orderId.slice(-8).toUpperCase()} - ฿${order.total.toFixed(2)}`;
            const result = await this.sendEmail(storeEmail, subject, html);
            if (result) {
                this.logger.log(`Pending payment notification sent to store: ${storeEmail}`);
            }
            return result;
        }
        catch (error) {
            this.logger.error(`Failed to send pending payment notification:`, error);
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