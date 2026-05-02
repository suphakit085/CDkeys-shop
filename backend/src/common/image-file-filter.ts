import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import type { FileFilterCallback } from 'multer';

const rasterMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
]);

const rasterExtensions = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.avif',
]);

function getAllowedTypes(allowSvg: boolean) {
  if (!allowSvg) {
    return {
      mimeTypes: rasterMimeTypes,
      extensions: rasterExtensions,
      label: 'JPG, PNG, GIF, WEBP, or AVIF',
    };
  }

  return {
    mimeTypes: new Set([...rasterMimeTypes, 'image/svg+xml']),
    extensions: new Set([...rasterExtensions, '.svg']),
    label: 'JPG, PNG, GIF, WEBP, AVIF, or SVG',
  };
}

export function createImageFileFilter(options: { allowSvg?: boolean } = {}) {
  const allowed = getAllowedTypes(Boolean(options.allowSvg));

  return (_req: unknown, file: Express.Multer.File, cb: FileFilterCallback) => {
    const mimetype = file.mimetype.toLowerCase();
    const extension = extname(file.originalname).toLowerCase();

    const mimetypeAllowed = allowed.mimeTypes.has(mimetype);
    const extensionAllowed = allowed.extensions.has(extension);
    const extensionFallbackAllowed =
      mimetype === 'application/octet-stream' && extensionAllowed;

    if (mimetypeAllowed || extensionFallbackAllowed) {
      cb(null, true);
      return;
    }

    cb(
      new BadRequestException(`Only ${allowed.label} image files are allowed`),
    );
  };
}
