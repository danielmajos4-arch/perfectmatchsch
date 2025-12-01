/**
 * Vercel Serverless Function for sending emails via Resend
 * POST /api/send-email
 */

import { Resend } from 'resend';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
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

    // Log environment variable status (for debugging - remove in production if needed)
    console.log('[Vercel API] Environment check:', {
      hasViteResendKey: !!process.env.VITE_RESEND_API_KEY,
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasApiKey: !!apiKey,
      fromEmail,
      supportEmail,
      nodeEnv: process.env.NODE_ENV
    });

    // Validate API key exists
    if (!apiKey) {
      console.error('[Vercel API] RESEND_API_KEY not found in environment');
      return res.status(500).json({ 
        success: false,
        error: 'Email service not configured - API key missing. Please set VITE_RESEND_API_KEY or RESEND_API_KEY in Vercel environment variables.' 
      });
    }

    console.log('[Vercel API] Initializing Resend with API key:', apiKey.substring(0, 10) + '...');

    // Initialize Resend with API key
    const resend = new Resend(apiKey);

    const { to, subject, html, text, replyTo, from, tags } = req.body;

    // Validate required fields
    if (!to || !subject || !html) {
      console.error('[Vercel API] Missing required fields:', { hasTo: !!to, hasSubject: !!subject, hasHtml: !!html });
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: to, subject, html' 
      });
    }

    console.log('[Vercel API] Sending email:', {
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      from: from || fromEmail,
      hasHtml: !!html,
      htmlLength: html?.length || 0
    });

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
      console.error('[Vercel API] Resend API error:', {
        message: result.error.message,
        name: result.error.name,
        fullError: result.error
      });
      return res.status(500).json({
        success: false,
        error: result.error.message || 'Failed to send email'
      });
    }

    console.log('[Vercel API] Email sent successfully:', {
      messageId: result.data?.id,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject
    });

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return res.status(200).json({
      success: true,
      messageId: result.data?.id
    });

  } catch (error) {
    console.error('[Vercel API] Error sending email:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Set CORS headers even on error
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email'
    });
  }
}

