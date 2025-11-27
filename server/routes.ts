import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { Resend } from "resend";

/**
 * Email sending endpoint
 * POST /api/send-email
 */
export async function sendEmail(req: Request, res: Response): Promise<void> {
  try {
    // Get API key from environment - try multiple variable names
    const apiKey = process.env.VITE_RESEND_API_KEY || 
                   process.env.RESEND_API_KEY;
    
    const fromEmail = process.env.VITE_FROM_EMAIL || 
                      process.env.VITE_RESEND_FROM_EMAIL ||
                      'onboarding@resend.dev';
    
    const supportEmail = process.env.VITE_SUPPORT_EMAIL || 
                         'delivered@resend.dev';

    // Log environment variable status (for debugging)
    console.log('[Server] Environment check:', {
      hasViteResendKey: !!process.env.VITE_RESEND_API_KEY,
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasApiKey: !!apiKey,
      fromEmail,
      supportEmail,
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('RESEND') || k.includes('EMAIL')).join(', ')
    });

    // Validate API key exists
    if (!apiKey) {
      console.error('[Server] RESEND_API_KEY not found in environment');
      console.error('[Server] Available env vars:', Object.keys(process.env).filter(k => k.includes('RESEND') || k.includes('EMAIL')));
      res.status(500).json({ 
        success: false,
        error: 'Email service not configured - API key missing. Please set VITE_RESEND_API_KEY or RESEND_API_KEY in .env file.' 
      });
      return;
    }

    console.log('[Server] Initializing Resend with API key:', apiKey.substring(0, 10) + '...');

    // Initialize Resend with API key (inside function to ensure env vars are loaded)
    const resend = new Resend(apiKey);

    const { to, subject, html, text, replyTo, from, tags } = req.body;

    // Validate required fields
    if (!to || !subject || !html) {
      console.error('[Server] Missing required fields:', { hasTo: !!to, hasSubject: !!subject, hasHtml: !!html });
      res.status(400).json({ 
        success: false,
        error: 'Missing required fields: to, subject, html' 
      });
      return;
    }

    console.log('[Server] Sending email:', {
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
      console.error('[Server] Resend API error:', {
        message: result.error.message,
        name: result.error.name,
        fullError: result.error
      });
      res.status(500).json({
        success: false,
        error: result.error.message || 'Failed to send email'
      });
      return;
    }

    console.log('[Server] Email sent successfully:', {
      messageId: result.data?.id,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject
    });

    res.status(200).json({
      success: true,
      messageId: result.data?.id
    });

  } catch (error: any) {
    console.error('[Server] Error sending email:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      fullError: error
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email'
    });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // Email sending endpoint
  app.post('/api/send-email', sendEmail);

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
