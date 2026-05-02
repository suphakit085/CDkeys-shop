import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { isConfiguredSet, isConfiguredValue } from '../common/env';
import { PrismaService } from '../prisma/prisma.service';

interface OrderDetails {
  orderId: string;
  customerEmail: string;
  customerName: string;
  items: Array<{
    gameTitle: string;
    platform: string;
    cdKey: string;
  }>;
  total: number;
}

interface PendingPaymentDetails {
  orderId: string;
  customerEmail: string;
  customerName: string;
  total: number;
  slipUrl: string;
  items: Array<{ gameTitle: string; platform: string }>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private resendApiKey: string | null = null;
  private useResend = false;

  constructor(private prisma: PrismaService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const resendKey = process.env.RESEND_API_KEY;
    if (isConfiguredValue(resendKey)) {
      this.resendApiKey = resendKey;
      this.useResend = true;
      this.logger.log('Email service initialized with Resend API');
      return;
    }

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!isConfiguredSet(host, user, pass)) {
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

  isConfigured(): boolean {
    return this.transporter !== null || this.useResend;
  }

  private getStoreName() {
    return process.env.STORE_NAME || 'CD Keys Marketplace';
  }

  private getFrontendUrl() {
    return (process.env.FRONTEND_URL || 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
  }

  private getFromEmail() {
    return (
      process.env.EMAIL_FROM ||
      process.env.SMTP_FROM ||
      process.env.SMTP_USER ||
      'CD Keys Marketplace <onboarding@resend.dev>'
    );
  }

  private async getAdminEmail() {
    if (isConfiguredValue(process.env.ADMIN_EMAIL)) {
      return process.env.ADMIN_EMAIL;
    }

    const admin = await this.prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { email: true },
      orderBy: { createdAt: 'asc' },
    });

    return admin?.email || process.env.SMTP_USER || '';
  }

  private formatMoney(amount: number) {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
  }

  private escapeHtml(value: string | number | boolean | null | undefined) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async sendWithResend(
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<boolean> {
    if (!this.resendApiKey) {
      return false;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.getFromEmail(),
          to: [to],
          subject,
          html,
          text,
        }),
      });

      if (response.ok) {
        this.logger.log(`Email sent via Resend to ${to}`);
        return true;
      }

      const error = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      this.logger.error(`Resend API error: ${JSON.stringify(error)}`);
      return false;
    } catch (error) {
      this.logger.error(`Resend API request failed: ${error}`);
      return false;
    }
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<boolean> {
    if (!to) {
      this.logger.warn(`Skipping email without recipient: ${subject}`);
      return false;
    }

    if (this.useResend) {
      return this.sendWithResend(to, subject, html, text);
    }

    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.getFromEmail(),
        to,
        subject,
        html,
        text,
      });
      this.logger.log(`Email sent via SMTP to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`SMTP send failed: ${error}`);
      return false;
    }
  }

  private emailLayout(options: {
    title: string;
    preview: string;
    body: string;
    accent?: string;
  }) {
    const storeName = this.escapeHtml(this.getStoreName());
    const accent = options.accent || '#0f766e';

    return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${this.escapeHtml(options.title)}</title>
    <style>
      body { margin: 0; padding: 0; background: #f4f7f8; color: #172033; font-family: Arial, sans-serif; }
      .wrapper { width: 100%; padding: 28px 12px; }
      .container { max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #d9e2e7; border-radius: 12px; overflow: hidden; }
      .header { padding: 28px 32px; background: ${accent}; color: #ffffff; }
      .brand { margin: 0; font-size: 14px; letter-spacing: .08em; text-transform: uppercase; }
      .title { margin: 10px 0 0; font-size: 24px; line-height: 1.25; }
      .content { padding: 30px 32px; }
      .muted { color: #5f6b7a; }
      .button { display: inline-block; padding: 13px 20px; border-radius: 8px; background: ${accent}; color: #ffffff !important; text-decoration: none; font-weight: 700; }
      .box { padding: 16px; border-radius: 10px; background: #f7fafb; border: 1px solid #dce6eb; }
      .code { font-family: Consolas, Monaco, monospace; font-size: 16px; color: #111827; word-break: break-all; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 12px; border-bottom: 1px solid #e5edf1; text-align: left; vertical-align: top; }
      th { color: #465365; font-size: 13px; background: #f7fafb; }
      .footer { padding: 20px 32px; color: #687485; font-size: 12px; background: #f7fafb; border-top: 1px solid #dce6eb; }
    </style>
  </head>
  <body>
    <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${this.escapeHtml(options.preview)}</span>
    <div class="wrapper">
      <div class="container">
        <div class="header">
          <p class="brand">${storeName}</p>
          <h1 class="title">${this.escapeHtml(options.title)}</h1>
        </div>
        <div class="content">
          ${options.body}
        </div>
        <div class="footer">
          This transactional email was sent by ${storeName}. If you need help, contact support from the store website.
        </div>
      </div>
    </div>
  </body>
</html>`;
  }

  async sendCdKeysEmail(order: OrderDetails): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn('Email not configured - skipping CD key delivery email');
      return false;
    }

    const orderCode = order.orderId.slice(0, 8).toUpperCase();
    const customerName = this.escapeHtml(order.customerName || 'Customer');
    const rows = order.items
      .map(
        (item) => `
          <tr>
            <td>
              <strong>${this.escapeHtml(item.gameTitle)}</strong><br>
              <span class="muted">${this.escapeHtml(item.platform)}</span>
            </td>
            <td class="code">${this.escapeHtml(item.cdKey)}</td>
          </tr>`,
      )
      .join('');

    const html = this.emailLayout({
      title: 'Your game keys are ready',
      preview: `Order #${orderCode} has been completed.`,
      accent: '#0f766e',
      body: `
        <p>Hello <strong>${customerName}</strong>,</p>
        <p>Your payment was confirmed. Here are the digital keys for your order.</p>
        <table>
          <thead>
            <tr>
              <th>Game</th>
              <th>CD Key</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="box" style="margin-top:20px">
          <p style="margin:0"><strong>Order:</strong> #${orderCode}</p>
          <p style="margin:8px 0 0"><strong>Total:</strong> ${this.escapeHtml(this.formatMoney(order.total))}</p>
        </div>
        <p class="muted">Keep these keys private. Do not share them with anyone else.</p>
      `,
    });

    const text = [
      `Your game keys are ready - Order #${orderCode}`,
      '',
      ...order.items.map(
        (item) => `${item.gameTitle} (${item.platform}): ${item.cdKey}`,
      ),
      '',
      `Total: ${this.formatMoney(order.total)}`,
    ].join('\n');

    const subject = `Your CD keys are ready - Order #${orderCode}`;
    const result = await this.sendEmail(
      order.customerEmail,
      subject,
      html,
      text,
    );

    if (result) {
      this.logger.log(
        `CD Keys email sent to ${order.customerEmail} for order ${order.orderId}`,
      );
    }

    return result;
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    userName: string,
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn('Email not configured - skipping password reset email');
      return false;
    }

    const resetLink = `${this.getFrontendUrl()}/reset-password/${resetToken}`;
    const safeLink = this.escapeHtml(resetLink);
    const html = this.emailLayout({
      title: 'Reset your password',
      preview: 'Use this secure link to set a new password.',
      accent: '#2563eb',
      body: `
        <p>Hello <strong>${this.escapeHtml(userName || 'there')}</strong>,</p>
        <p>We received a request to reset the password for your account.</p>
        <p style="margin:28px 0"><a class="button" href="${safeLink}">Reset password</a></p>
        <p class="muted">This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>
        <div class="box"><span class="code">${safeLink}</span></div>
      `,
    });

    const text = [
      'Reset your password',
      '',
      'Use this link to reset your password. It expires in 1 hour.',
      resetLink,
      '',
      'If you did not request this, ignore this email.',
    ].join('\n');

    return this.sendEmail(
      email,
      `Reset your password - ${this.getStoreName()}`,
      html,
      text,
    );
  }

  async sendMagicLinkEmail(
    email: string,
    magicToken: string,
    userName: string,
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn('Email not configured - skipping magic link email');
      return false;
    }

    const magicLink = `${this.getFrontendUrl()}/magic-login/${magicToken}`;
    const safeLink = this.escapeHtml(magicLink);
    const html = this.emailLayout({
      title: 'Sign in to your account',
      preview: 'Use this secure link to sign in.',
      accent: '#0f766e',
      body: `
        <p>Hello <strong>${this.escapeHtml(userName || 'there')}</strong>,</p>
        <p>Click the button below to sign in without entering a password.</p>
        <p style="margin:28px 0"><a class="button" href="${safeLink}">Sign in</a></p>
        <p class="muted">This link expires in 15 minutes and can be used once.</p>
        <div class="box"><span class="code">${safeLink}</span></div>
      `,
    });

    const text = [
      'Sign in to your account',
      '',
      'Use this one-time link to sign in. It expires in 15 minutes.',
      magicLink,
    ].join('\n');

    return this.sendEmail(
      email,
      `Sign in to ${this.getStoreName()}`,
      html,
      text,
    );
  }

  async sendRegistrationMagicLinkEmail(
    email: string,
    magicToken: string,
    userName: string,
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn(
        'Email not configured - skipping registration magic link email',
      );
      return false;
    }

    const verifyLink = `${this.getFrontendUrl()}/magic-login/${magicToken}`;
    const safeLink = this.escapeHtml(verifyLink);
    const html = this.emailLayout({
      title: 'Activate your account',
      preview: `Welcome to ${this.getStoreName()}. Activate your account.`,
      accent: '#0f766e',
      body: `
        <p>Hello <strong>${this.escapeHtml(userName || 'there')}</strong>,</p>
        <p>Welcome to ${this.escapeHtml(this.getStoreName())}. Activate your account to start shopping.</p>
        <p style="margin:28px 0"><a class="button" href="${safeLink}">Activate account</a></p>
        <p class="muted">This link expires in 24 hours.</p>
        <div class="box"><span class="code">${safeLink}</span></div>
      `,
    });

    const text = [
      'Activate your account',
      '',
      `Welcome to ${this.getStoreName()}. Use this link to activate your account:`,
      verifyLink,
    ].join('\n');

    return this.sendEmail(
      email,
      `Activate your ${this.getStoreName()} account`,
      html,
      text,
    );
  }

  async sendNewOrderNotification(order: OrderDetails): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn('Email not configured - skipping order notification');
      return false;
    }

    const adminEmail = await this.getAdminEmail();
    if (!adminEmail) {
      this.logger.warn('ADMIN_EMAIL not configured - skipping admin email');
      return false;
    }

    const orderCode = order.orderId.slice(0, 8).toUpperCase();
    const rows = order.items
      .map(
        (item) => `
          <tr>
            <td>${this.escapeHtml(item.gameTitle)}</td>
            <td>${this.escapeHtml(item.platform)}</td>
            <td class="code">${this.escapeHtml(item.cdKey)}</td>
          </tr>`,
      )
      .join('');

    const html = this.emailLayout({
      title: 'New completed order',
      preview: `Order #${orderCode} was completed.`,
      accent: '#111827',
      body: `
        <div class="box">
          <p style="margin:0"><strong>Order:</strong> #${orderCode}</p>
          <p style="margin:8px 0 0"><strong>Customer:</strong> ${this.escapeHtml(order.customerName)} (${this.escapeHtml(order.customerEmail)})</p>
          <p style="margin:8px 0 0"><strong>Total:</strong> ${this.escapeHtml(this.formatMoney(order.total))}</p>
        </div>
        <table style="margin-top:20px">
          <thead>
            <tr>
              <th>Game</th>
              <th>Platform</th>
              <th>CD Key</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `,
    });

    const text = [
      `New completed order #${orderCode}`,
      `Customer: ${order.customerName} <${order.customerEmail}>`,
      `Total: ${this.formatMoney(order.total)}`,
    ].join('\n');

    return this.sendEmail(
      adminEmail,
      `New completed order #${orderCode}`,
      html,
      text,
    );
  }

  async sendPendingPaymentNotification(
    order: PendingPaymentDetails,
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn(
        'Email not configured - skipping pending payment notification',
      );
      return false;
    }

    const adminEmail = await this.getAdminEmail();
    if (!adminEmail) {
      this.logger.warn('ADMIN_EMAIL not configured - skipping admin email');
      return false;
    }

    const orderCode = order.orderId.slice(0, 8).toUpperCase();
    const adminLink = `${this.getFrontendUrl()}/admin/verify-payments`;
    const items = order.items
      .map(
        (item) =>
          `<li>${this.escapeHtml(item.gameTitle)} - ${this.escapeHtml(item.platform)}</li>`,
      )
      .join('');

    const html = this.emailLayout({
      title: 'PromptPay slip needs review',
      preview: `Order #${orderCode} has a slip waiting for review.`,
      accent: '#b45309',
      body: `
        <div class="box">
          <p style="margin:0"><strong>Order:</strong> #${orderCode}</p>
          <p style="margin:8px 0 0"><strong>Customer:</strong> ${this.escapeHtml(order.customerName)} (${this.escapeHtml(order.customerEmail)})</p>
          <p style="margin:8px 0 0"><strong>Total:</strong> ${this.escapeHtml(this.formatMoney(order.total))}</p>
        </div>
        <h2 style="font-size:16px;margin:22px 0 8px">Items</h2>
        <ul>${items}</ul>
        <p style="margin:24px 0">
          <a class="button" href="${this.escapeHtml(adminLink)}">Review payment</a>
        </p>
        <p><a href="${this.escapeHtml(order.slipUrl)}">View uploaded slip</a></p>
      `,
    });

    const text = [
      `PromptPay slip needs review - Order #${orderCode}`,
      `Customer: ${order.customerName} <${order.customerEmail}>`,
      `Total: ${this.formatMoney(order.total)}`,
      `Admin: ${adminLink}`,
      `Slip: ${order.slipUrl}`,
    ].join('\n');

    return this.sendEmail(
      adminEmail,
      `PromptPay slip needs review #${orderCode}`,
      html,
      text,
    );
  }
}
