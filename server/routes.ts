import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { Resend } from "resend";

/**
 * Email sending endpoint
 * POST /api/send-email
 * Note: In production, use the Vercel serverless function at /api/send-email.js instead
 */
export async function sendEmail(req: Request, res: Response): Promise<void> {
  try {
    // Get API key from environment
    const apiKey = process.env.VITE_RESEND_API_KEY || 
                   process.env.RESEND_API_KEY;
    
    const fromEmail = process.env.VITE_FROM_EMAIL || 
                      process.env.VITE_RESEND_FROM_EMAIL ||
                      'onboarding@resend.dev';
    
    const supportEmail = process.env.VITE_SUPPORT_EMAIL || 
                         'delivered@resend.dev';

    // Validate API key exists
    if (!apiKey) {
      res.status(500).json({ 
        success: false,
        error: 'Email service not configured'
      });
      return;
    }

    // Initialize Resend with API key
    const resend = new Resend(apiKey);

    const { to, subject, html, text, replyTo, from, tags } = req.body;

    // Validate required fields
    if (!to || !subject || !html) {
      res.status(400).json({ 
        success: false,
        error: 'Missing required fields: to, subject, html' 
      });
      return;
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
      res.status(500).json({
        success: false,
        error: 'Failed to send email'
      });
      return;
    }

    res.status(200).json({
      success: true,
      messageId: result.data?.id
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to send email'
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
