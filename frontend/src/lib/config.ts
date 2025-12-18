// API configuration for production deployment
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Helper to get full URL for uploaded files
export function getUploadUrl(path: string): string {
    if (!path) return '';
    // If path is already a full URL (Cloudinary, etc), return as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    // Otherwise, prepend backend URL
    return `${BACKEND_URL}${path}`;
}
