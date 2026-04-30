"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isConfiguredValue = isConfiguredValue;
exports.isConfiguredSet = isConfiguredSet;
const PLACEHOLDER_PATTERNS = [
    /^your-/i,
    /^change-/i,
    /^example/i,
    /^placeholder/i,
    /^dummy/i,
];
function isConfiguredValue(value) {
    if (!value) {
        return false;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return false;
    }
    return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}
function isConfiguredSet(...values) {
    return values.every(isConfiguredValue);
}
//# sourceMappingURL=env.js.map