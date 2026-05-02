import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

const DEFAULT_LOGIN_MAX_ATTEMPTS = 5;
const DEFAULT_LOGIN_WINDOW_SECONDS = 15 * 60;
const DEFAULT_LOGIN_LOCK_SECONDS = 15 * 60;
const DEFAULT_AUTH_REQUEST_MAX_ATTEMPTS = 10;
const DEFAULT_AUTH_REQUEST_WINDOW_SECONDS = 10 * 60;

type LoginAttempt = {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
};

type RequestBucket = {
  count: number;
  resetsAt: number;
};

@Injectable()
export class AuthRateLimitService {
  private readonly loginAttempts = new Map<string, LoginAttempt>();
  private readonly requestBuckets = new Map<string, RequestBucket>();

  assertLoginAllowed(req: Request, email: string) {
    const key = this.getLoginKey(req, email);
    const attempt = this.loginAttempts.get(key);

    if (!attempt?.lockedUntil || Date.now() >= attempt.lockedUntil) {
      return;
    }

    throw new HttpException(
      `Too many failed login attempts. Try again in ${this.secondsUntil(
        attempt.lockedUntil,
      )} seconds.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  recordLoginSuccess(req: Request, email: string) {
    this.loginAttempts.delete(this.getLoginKey(req, email));
  }

  recordLoginFailure(req: Request, email: string) {
    const key = this.getLoginKey(req, email);
    const now = Date.now();
    const windowMs = this.loginWindowSeconds() * 1000;
    const lockMs = this.loginLockSeconds() * 1000;
    const current = this.loginAttempts.get(key);
    const next =
      current && now - current.firstAttemptAt <= windowMs
        ? {
            ...current,
            count: current.count + 1,
          }
        : {
            count: 1,
            firstAttemptAt: now,
          };

    if (next.count >= this.loginMaxAttempts()) {
      next.lockedUntil = now + lockMs;
    }

    this.loginAttempts.set(key, next);
  }

  async protectLogin<T>(req: Request, email: string, action: () => Promise<T>) {
    this.assertLoginAllowed(req, email);

    try {
      const result = await action();
      this.recordLoginSuccess(req, email);
      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.recordLoginFailure(req, email);
      }
      throw error;
    }
  }

  consumeAuthRequest(req: Request, action: string, identity?: string) {
    this.consumeBucket([action, this.getClientIp(req), 'global'].join(':'));

    if (!identity) {
      return;
    }

    this.consumeBucket(
      [action, this.getClientIp(req), this.normalizeIdentity(identity)].join(
        ':',
      ),
    );
  }

  private consumeBucket(key: string) {
    const now = Date.now();
    const windowMs = this.authRequestWindowSeconds() * 1000;
    const current = this.requestBuckets.get(key);
    const bucket =
      current && now < current.resetsAt
        ? current
        : {
            count: 0,
            resetsAt: now + windowMs,
          };

    bucket.count += 1;
    this.requestBuckets.set(key, bucket);

    if (bucket.count > this.authRequestMaxAttempts()) {
      throw new HttpException(
        `Too many requests. Try again in ${this.secondsUntil(
          bucket.resetsAt,
        )} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private getLoginKey(req: Request, email: string) {
    return `${this.getClientIp(req)}:${this.normalizeIdentity(email)}`;
  }

  private getClientIp(req: Request) {
    const forwardedFor = req.headers['x-forwarded-for'];
    const rawIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0];

    return (rawIp || req.ip || req.socket.remoteAddress || 'unknown').trim();
  }

  private normalizeIdentity(value?: string) {
    return (value || 'anonymous').trim().toLowerCase();
  }

  private secondsUntil(timestamp: number) {
    return Math.max(1, Math.ceil((timestamp - Date.now()) / 1000));
  }

  private loginMaxAttempts() {
    return this.getPositiveInt(
      process.env.AUTH_LOGIN_MAX_ATTEMPTS,
      DEFAULT_LOGIN_MAX_ATTEMPTS,
    );
  }

  private loginWindowSeconds() {
    return this.getPositiveInt(
      process.env.AUTH_LOGIN_WINDOW_SECONDS,
      DEFAULT_LOGIN_WINDOW_SECONDS,
    );
  }

  private loginLockSeconds() {
    return this.getPositiveInt(
      process.env.AUTH_LOGIN_LOCK_SECONDS,
      DEFAULT_LOGIN_LOCK_SECONDS,
    );
  }

  private authRequestMaxAttempts() {
    return this.getPositiveInt(
      process.env.AUTH_REQUEST_MAX_ATTEMPTS,
      DEFAULT_AUTH_REQUEST_MAX_ATTEMPTS,
    );
  }

  private authRequestWindowSeconds() {
    return this.getPositiveInt(
      process.env.AUTH_REQUEST_WINDOW_SECONDS,
      DEFAULT_AUTH_REQUEST_WINDOW_SECONDS,
    );
  }

  private getPositiveInt(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0
      ? Math.floor(parsed)
      : fallback;
  }
}
