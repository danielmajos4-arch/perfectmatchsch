/**
 * Vercel Serverless Function for sending emails via Resend
 * POST /api/send-email
 * 
 * Security features:
 * - JWT authentication via Supabase
 * - Rate limiting per user
 * - CORS restricted to allowed origins
 */

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 10; // Max 10 emails per minute per user

// In-memory rate limit store (resets on cold start, but protects during warm instances)
// For production, consider using Upstash Redis or Vercel KV for persistent rate limiting
const rateLimitStore = new Map();

/**
 * Check if user has exceeded rate limit
 * @param {string} userId - User ID or IP address
 * @returns {{ allowed: boolean, remaining: number, resetAt: number }}
 */
function checkRateLimit(userId) {
  const now = Date.now();
  const key = `email:${userId}`;
  
  let record = rateLimitStore.get(key);
  
  // Clean up expired entries periodically
  if (rateLimitStore.size > 1000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
  }
  
  // Create new record if none exists or if window has expired
  if (!record || record.resetAt < now) {
    record = {
      count: 0,
      resetAt: now + RATE_LIMIT_WINDOW_MS
    };
  }
  
  // Increment request count
  record.count++;
  rateLimitStore.set(key, record);
  
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - record.count);
  const allowed = record.count <= RATE_LIMIT_MAX_REQUESTS;
  
  return {
    allowed,
    remaining,
    resetAt: record.resetAt
  };
}

// Get allowed origins from environment or use defaults
function getAllowedOrigin(requestOrigin) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];
  
  // Add the Vercel deployment URL if available
  if (process.env.VERCEL_URL) {
    allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
  }
  
  // Add production URL if configured
  if (process.env.PRODUCTION_URL) {
    allowedOrigins.push(process.env.PRODUCTION_URL);
  }
  
  // Check if request origin is allowed
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  
  // Return first allowed origin as default (for same-origin requests)
  return allowedOrigins[0];
}

// Set CORS headers
function setCorsHeaders(req, res) {
  const origin = getAllowedOrigin(req.headers.origin);
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

// Verify Supabase JWT token
async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.substring(7);
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    // If service key not configured, allow request but log warning
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Auth] Service role key not configured - skipping auth in development');
      return { authenticated: true, user: null };
    }
    return { authenticated: false, error: 'Auth service not configured' };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { authenticated: false, error: 'Invalid or expired token' };
    }
    
    return { authenticated: true, user };
  } catch (err) {
    return { authenticated: false, error: 'Auth verification failed' };
  }
}

export default async function handler(req, res) {
  // Set CORS headers for all responses
  setCorsHeaders(req, res);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  // Verify authentication
  const auth = await verifyAuth(req);
  if (!auth.authenticated) {
    return res.status(401).json({
      success: false,
      error: auth.error || 'Unauthorized'
    });
  }

  // Apply rate limiting based on user ID or IP
  const rateLimitKey = auth.user?.id || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anonymous';
  const rateLimit = checkRateLimit(rateLimitKey);
  
  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetAt / 1000));
  
  if (!rateLimit.allowed) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
    });
  }

  try {
    // Get API key from environment - try multiple variable names
    // Vercel will inject VITE_* variables, but we also check non-prefixed versions
    const apiKey = process.env.VITE_RESEND_API_KEY || 
                   process.env.RESEND_API_KEY;
    
    const fromEmail = process.env.VITE_FROM_EMAIL || 
                      process.env.VITE_RESEND_FROM_EMAIL ||
                      process.env.RESEND_FROM_EMAIL ||
                      'onboarding@resend.dev';
    
    const supportEmail = process.env.VITE_SUPPORT_EMAIL || 
                         process.env.SUPPORT_EMAIL ||
                         'delivered@resend.dev';

    // Validate API key exists
    if (!apiKey) {
      console.error('[Vercel API] Email service not configured');
      return res.status(500).json({ 
        success: false,
        error: 'Email service not configured'
      });
    }

    // Initialize Resend with API key
    const resend = new Resend(apiKey);

    const { to, subject, html, text, replyTo, from, tags } = req.body;

    // Validate required fields
    if (!to || !subject || !html) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: to, subject, html' 
      });
    }

    // Send email via Resend
    const result = await resend.emails.send({
      from: from || fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || subject,
      reply_to: replyTo || supportEmail,
      tags: tags || []
    });

    if (result.error) {
      console.error('[Vercel API] Email send failed');
      return res.status(500).json({
        success: false,
        error: 'Failed to send email'
      });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Vercel API] Email sent successfully:', {
        messageId: result.data?.id,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject
      });
    }

    return res.status(200).json({
      success: true,
      messageId: result.data?.id
    });

  } catch (error) {
    console.error('[Vercel API] Error sending email:', error.message);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to send email'
    });
  }
}

