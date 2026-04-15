const nodemailer = require("nodemailer");
const Venue = require("../models/Venue");

// Add your logo URL here
const LOGO_URL = "https://res.cloudinary.com/dmpxbwwjt/image/upload/v1774978846/Mixmind_iwzfyz.jpg";

/**
 * Email Service for sending DJ decision notifications
 */

// Create transporter
const createTransporter = () => {
  console.log(`\n📧 EMAIL SERVICE - Creating transporter`);
  console.log(`   GMAIL_USER: ${process.env.GMAIL_USER || "NOT SET"}`);
  console.log(`   GMAIL_PASSWORD: ${process.env.GMAIL_PASSWORD ? "***SET***" : "NOT SET"}`);
  console.log(`   EMAIL_SERVICE: ${process.env.EMAIL_SERVICE || "default (gmail)"}`);

  if (process.env.EMAIL_SERVICE === "gmail") {
    console.log(`   ✅ Using Gmail service`);
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD
      }
    });
  } else if (process.env.EMAIL_SERVICE === "sendgrid") {
    console.log(`   ✅ Using SendGrid service`);
    return nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      auth: {
        user: "apikey",
        pass: process.env.SENDGRID_API_KEY
      }
    });
  } else {
    console.log(`   ✅ Using default Gmail service`);
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD
      }
    });
  }
};

// Exact CSS match from your provided HTML
const EMAIL_HEAD = `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Outfit', sans-serif; background-color: #07070B; -webkit-font-smoothing: antialiased; }
    
    .font-display { font-family: 'Space Grotesk', sans-serif; }
    
    .glow-button {
      background: linear-gradient(135deg, #A855F7 0%, #7C3AED 100%);
      box-shadow: 0 8px 50px rgba(168,85,247,0.6), 0 0 80px rgba(168,85,247,0.3), 0 4px 20px rgba(0,0,0,0.3);
      transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1);
    }
    
    .secondary-button {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.08);
      transition: all 0.2s;
    }
  </style>
`;

/**
 * Send email when DJ accepts a request
 */
async function sendDJAcceptanceEmail(request, venue) {
  try {
    const user = request.userId;
    const songTitle = request.title || request.songTitle;
    const artistName = request.artist || request.artistName;
    const venueId = request.venueId || venue?._id || "";
    const FRONTEND_URL = process.env.FRONTEND_URL || "https://mixmind.app";
    const REQUEST_PAGE_URL = `${FRONTEND_URL}/venue-request/${venueId}`;

    console.log(`📧 Preparing DJ ACCEPTANCE email for: ${user.email}`);

    const mailOptions = {
      from: process.env.GMAIL_USER || "noreply@mixmind.com",
      to: user.email,
      subject: "🎵 Your Song Request Was Approved! - MixMind",
      html: `
        <!DOCTYPE html>
        <html>
        <head>${EMAIL_HEAD}</head>
        <body style="background-color: #07070B; padding: 40px 20px;">
          <div style="max-width: 450px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, rgba(18,18,34,0.92) 0%, rgba(18,18,34,0.55) 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px;">

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <div style="width: 100px; height: 100px; border-radius: 50%; box-shadow: 0 0 30px rgba(34,227,161,0.3); line-height: 100px; text-align: center; background: rgba(34,227,161,0.05);">
                      <img src="${LOGO_URL}" width="62" height="62" style="vertical-align: middle; border-radius: 50%;" alt="MixMind"/>
                    </div>
                  </td>
                </tr>
              </table>
              
              <h1 class="font-display" style="font-size: 30px; font-weight: 700; text-align: center; margin-bottom: 12px; color: #FFFFFF;">Your song is approved 🎉</h1>
              
              <p style="text-align: center; font-size: 14px; margin-bottom: 24px; color: rgba(255,255,255,0.72);">Good news! Your song request has been accepted and added to the queue.</p>
              
              <div style="background: rgba(168,85,247,0.08); border: 1px solid rgba(168,85,247,0.2); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <div style="margin-bottom: 12px;">
                  <p style="font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.5); margin-bottom: 4px;">Song Title</p>
                  <p style="font-size: 14px; font-weight: 600; color: #FFFFFF;">${songTitle}</p>
                </div>
                <div>
                  <p style="font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.5); margin-bottom: 4px;">Artist Name</p>
                  <p style="font-size: 14px; font-weight: 600; color: #FFFFFF;">${artistName}</p>
                </div>
              </div>
              
              <p style="text-align: center; font-size: 12px; margin-bottom: 24px; padding: 0 8px; color: rgba(255,255,255,0.72);">Your song will be played shortly depending on the queue.</p>
              
              <a href="${REQUEST_PAGE_URL}" class="glow-button font-display" style="display: block; width: 100%; text-decoration: none; color: #FFFFFF; font-weight: 700; padding: 16px 0; border-radius: 16px; font-size: 14px; text-align: center; margin-bottom: 12px;">
                View Status
              </a>
              
              <a href="${REQUEST_PAGE_URL}" class="secondary-button" style="display: block; width: 100%; text-decoration: none; color: #FFFFFF; font-weight: 700; padding: 16px 0; border-radius: 16px; font-size: 14px; text-align: center;">
                Request Another Song
              </a>
              
              <p style="font-size: 12px; text-align: center; margin-top: 24px; color: rgba(255,255,255,0.4);">Thank you for using MixMind</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`✅ DJ ACCEPTANCE email sent to ${user.email}`);
    return { success: true, message: "Acceptance email sent" };
  } catch (err) {
    console.error(`❌ Failed to send DJ acceptance email:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send email when DJ rejects a request
 */
async function sendDJRejectionEmail(request, venue, rejectionReason) {
  try {
    const user = request.userId;
    const songTitle = request.title || request.songTitle;
    const artistName = request.artist || request.artistName;
    const venueId = request.venueId || venue?._id || "";
    const FRONTEND_URL = process.env.FRONTEND_URL || "https://mixmind.app";
    const REQUEST_PAGE_URL = `${FRONTEND_URL}/venue-request/${venueId}`;

    console.log(`📧 Preparing DJ REJECTION email for: ${user.email}`);

    const mailOptions = {
      from: process.env.GMAIL_USER || "noreply@mixmind.com",
      to: user.email,
      subject: "❌ Your Song Request Wasn't Approved - MixMind",
      html: `
        <!DOCTYPE html>
        <html>
        <head>${EMAIL_HEAD}</head>
        <body style="background-color: #07070B; padding: 40px 20px;">
          <div style="max-width: 450px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, rgba(18,18,34,0.92) 0%, rgba(18,18,34,0.55) 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px;">
              
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <div style="width: 100px; height: 100px; border-radius: 50%; box-shadow: 0 0 30px rgba(168,85,247,0.3); line-height: 100px; text-align: center; background: rgba(168,85,247,0.05);">
                      <img src="${LOGO_URL}" width="62" height="62" style="vertical-align: middle; border-radius: 50%;" alt="MixMind"/>
                    </div>
                  </td>
                </tr>
              </table>
              
              <h1 class="font-display" style="font-size: 30px; font-weight: 700; text-align: center; margin-bottom: 12px; color: #FFFFFF;">Your request wasn't approved</h1>
              
              <p style="text-align: center; font-size: 14px; margin-bottom: 24px; color: rgba(255,255,255,0.72);">Unfortunately, your song doesn't match the venue's music policy.</p>
              
              <div style="background: rgba(168,85,247,0.08); border: 1px solid rgba(168,85,247,0.2); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <div style="margin-bottom: 12px;">
                  <p style="font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.5); margin-bottom: 4px;">Song Title</p>
                  <p style="font-size: 14px; font-weight: 600; color: #FFFFFF;">${songTitle}</p>
                </div>
                <div>
                  <p style="font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.5); margin-bottom: 4px;">Artist Name</p>
                  <p style="font-size: 14px; font-weight: 600; color: #FFFFFF;">${artistName}</p>
                </div>
              </div>
              
              <div style="background: rgba(34,227,161,0.08); border: 1px solid rgba(34,227,161,0.2); border-radius: 12px; padding: 12px; margin-bottom: 24px;">
                <p style="text-align: center; font-size: 12px; font-weight: 600; color: #22E3A1;">✓ You were not charged for this request</p>
              </div>
              
              <a href="${REQUEST_PAGE_URL}" class="glow-button font-display" style="display: block; width: 100%; text-decoration: none; color: #FFFFFF; font-weight: 700; padding: 16px 0; border-radius: 16px; font-size: 14px; text-align: center;">
                Try Another Song
              </a>
              
              <p style="font-size: 12px; text-align: center; margin-top: 24px; color: rgba(255,255,255,0.4);">Explore different songs that match the vibe</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`✅ DJ REJECTION email sent to ${user.email}`);
    return { success: true, message: "Rejection email sent" };
  } catch (err) {
    console.error(`❌ Failed to send DJ rejection email:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send email when song is rejected due to genre mismatch
 */
async function sendGenreRejectionEmail(request, venue, rejectionReason, songTags) {
  try {
    const user = request.userId;
    const songTitle = request.title || request.songTitle;
    const artistName = request.artist || request.artistName;
    const venueId = request.venueId || venue?._id || "";
    const FRONTEND_URL = process.env.FRONTEND_URL || "https://mixmind.app";
    const REQUEST_PAGE_URL = `${FRONTEND_URL}/venue-request/${venueId}`;

    const mailOptions = {
      from: process.env.GMAIL_USER || "noreply@mixmind.com",
      to: user.email,
      subject: `🎵 Song Request - Genre Mismatch | ${venue?.name || "Venue"}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>${EMAIL_HEAD}</head>
        <body style="background-color: #07070B; padding: 40px 20px;">
          <div style="max-width: 450px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, rgba(18,18,34,0.92) 0%, rgba(18,18,34,0.55) 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px;">
              
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <div style="width: 100px; height: 100px; border-radius: 50%; box-shadow: 0 0 30px rgba(168,85,247,0.3); line-height: 100px; text-align: center; background: rgba(168,85,247,0.05);">
                      <img src="${LOGO_URL}" width="62" height="62" style="vertical-align: middle; border-radius: 50%;" alt="MixMind"/>
                    </div>
                  </td>
                </tr>
              </table>
              
              <h1 class="font-display" style="font-size: 30px; font-weight: 700; text-align: center; margin-bottom: 12px; color: #FFFFFF;">Genre Mismatch</h1>
              
              <p style="text-align: center; font-size: 14px; margin-bottom: 24px; color: rgba(255,255,255,0.72);">Unfortunately, your song doesn't match the current vibe at the venue.</p>
              
              <div style="background: rgba(168,85,247,0.08); border: 1px solid rgba(168,85,247,0.2); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <div style="margin-bottom: 12px;">
                  <p style="font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.5); margin-bottom: 4px;">Song Title</p>
                  <p style="font-size: 14px; font-weight: 600; color: #FFFFFF;">${songTitle}</p>
                </div>
                <div style="margin-bottom: 12px;">
                  <p style="font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.5); margin-bottom: 4px;">Artist Name</p>
                  <p style="font-size: 14px; font-weight: 600; color: #FFFFFF;">${artistName}</p>
                </div>
                <div>
                  <p style="font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.5); margin-bottom: 4px;">Detected Genres</p>
                  <p style="font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.8);">${(songTags || []).join(", ") || "Unknown"}</p>
                </div>
              </div>

              <div style="background: rgba(34,227,161,0.08); border: 1px solid rgba(34,227,161,0.2); border-radius: 12px; padding: 12px; margin-bottom: 24px;">
                <p style="text-align: center; font-size: 12px; font-weight: 600; color: #22E3A1;">✓ You were not charged for this request</p>
              </div>
              
              <a href="${REQUEST_PAGE_URL}" class="glow-button font-display" style="display: block; width: 100%; text-decoration: none; color: #FFFFFF; font-weight: 700; padding: 16px 0; border-radius: 16px; font-size: 14px; text-align: center;">
                Try Another Song
              </a>
              
              <p style="font-size: 12px; text-align: center; margin-top: 24px; color: rgba(255,255,255,0.4);">Thank you for using MixMind</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`✅ GENRE REJECTION email sent to ${user.email}`);
    return { success: true, message: "Genre rejection email sent" };
  } catch (err) {
    console.error(`❌ Failed to send genre rejection email:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send waitlist confirmation email to venue
 */
async function sendWaitlistConfirmation(email, name, venueName) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.GMAIL_USER || "noreply@mixmind.co.uk",
      to: email,
      subject: "🎵 Welcome to MixMind Early Access Waitlist!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background-color: #07070B;
              color: #ffffff;
              line-height: 1.6;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: linear-gradient(135deg, #1a0f2e 0%, #140822 100%);
              border: 2px solid rgba(168, 85, 247, 0.3);
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 8px 32px rgba(168, 85, 247, 0.1);
            }
            h1 {
              color: #a855f7;
              margin: 20px 0;
              font-size: 28px;
            }
            .badge {
              display: inline-block;
              background: rgba(168, 85, 247, 0.2);
              border: 1px solid rgba(168, 85, 247, 0.5);
              color: #a855f7;
              padding: 8px 16px;
              border-radius: 8px;
              font-weight: bold;
              margin-bottom: 20px;
              font-size: 12px;
              text-transform: uppercase;
            }
            .details {
              background: rgba(168, 85, 247, 0.1);
              border-left: 4px solid #a855f7;
              padding: 20px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .detail-row {
              margin: 10px 0;
              display: flex;
              justify-content: space-between;
            }
            .label {
              color: #a855f7;
              font-weight: bold;
            }
            .value {
              color: #ffffff;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
              color: white;
              padding: 12px 32px;
              text-decoration: none;
              border-radius: 8px;
              margin: 20px 0;
              font-weight: bold;
              transition: all 0.3s ease;
            }
            .button:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 20px rgba(168, 85, 247, 0.4);
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid rgba(168, 85, 247, 0.2);
              color: #a895d0;
              font-size: 12px;
              text-align: center;
            }
            .features {
              margin: 20px 0;
              padding: 20px;
              background: rgba(168, 85, 247, 0.05);
              border-radius: 8px;
            }
            .feature-item {
              margin: 10px 0;
              padding-left: 20px;
            }
            .feature-item:before {
              content: "✓ ";
              color: #a855f7;
              font-weight: bold;
              margin-right: 8px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
              <tr>
                <td align="left">
                  <div style="width: 80px; height: 80px; border-radius: 50%; box-shadow: 0 0 30px rgba(168,85,247,0.3); line-height: 80px; text-align: center; background: rgba(168,85,247,0.05);">
                    <img src="${LOGO_URL}" width="50" height="50" style="vertical-align: middle; border-radius: 50%;" alt="MixMind"/>
                  </div>
                </td>
              </tr>
            </table>
            
            <div class="badge">Early Access Waitlist</div>
            
            <h1>You're In! 🎉</h1>
            
            <p>Hi <strong>${name}</strong>,</p>
            
            <p>Thank you for joining the MixMind early access waitlist! We're thrilled that <strong>${venueName}</strong> is interested in transforming your music experience.</p>
            
            <div class="details">
              <div class="detail-row">
                <span class="label">Venue:</span>
                <span class="value">${venueName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Contact Email:</span>
                <span class="value">${email}</span>
              </div>
              <div class="detail-row">
                <span class="label">Status:</span>
                <span class="value" style="color: #22e3a1;">Waitlist - Pending Onboarding</span>
              </div>
            </div>
            
            <p>Here's what happens next:</p>
            
            <div class="features">
              <div class="feature-item">Our team will review your venue</div>
              <div class="feature-item">We'll reach out to discuss setup and integration</div>
              <div class="feature-item">You'll get personal onboarding support</div>
              <div class="feature-item">Your venue goes live with full MixMind features</div>
            </div>
            
            <p><strong>What is MixMind?</strong></p>
            <p>MixMind is a revolutionary platform that empowers DJs and venues to create seamless, integrated music experiences. From live playlists to automated DJ workflows, we make your venue unforgettable.</p>
            
            <p><strong>Questions?</strong><br>
            Reply to this email or visit our website to learn more about how MixMind can transform your venue.</p>
            
            <p style="margin-top: 30px;">See you soon! 🚀</p>
            
            <p>Best regards,<br>
            <strong>The MixMind Team</strong></p>
            
            <div class="footer">
              <p>© 2024 MixMind. All rights reserved.</p>
              <p>You received this email because you signed up for the MixMind early access waitlist.</p>
              <p>Get ready to elevate your venue's music experience with MixMind.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ WAITLIST CONFIRMATION email sent to ${email}`);
    return { success: true, message: "Waitlist confirmation email sent" };
  } catch (err) {
    console.error(`❌ Failed to send waitlist confirmation email:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send coupon code after Stripe payment
 */
async function sendCouponCode(email, userName, couponCode, discount, expiresAt) {
  try {
    console.log(`\n📧 SEND COUPON CODE EMAIL`);
    console.log(`   To: ${email}`);
    console.log(`   User: ${userName}`);
    console.log(`   Code: ${couponCode}`);
    console.log(`   Discount: £${discount}`);

    const daysUntilExpiry = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24));
    const FRONTEND_URL = process.env.FRONTEND_URL || "https://mixmind.app";
    const REQUEST_PAGE_URL = `${FRONTEND_URL}/venue-request`;

    const mailOptions = {
      from: process.env.GMAIL_USER || "noreply@mixmind.com",
      to: email,
      subject: `🎉 Your MixMind Coupon: £${discount} Off! - Expires in ${daysUntilExpiry} days`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>${EMAIL_HEAD}</head>
        <body style="background-color: #07070B; padding: 40px 20px;">
          <div style="max-width: 500px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, rgba(18,18,34,0.92) 0%, rgba(18,18,34,0.55) 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px;">

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <div style="width: 100px; height: 100px; border-radius: 50%; box-shadow: 0 0 30px rgba(34,227,161,0.3); line-height: 100px; text-align: center; background: rgba(34,227,161,0.05);">
                      <img src="${LOGO_URL}" width="62" height="62" style="vertical-align: middle; border-radius: 50%;" alt="MixMind"/>
                    </div>
                  </td>
                </tr>
              </table>

              <h1 class="font-display" style="font-size: 32px; font-weight: 700; text-align: center; margin-bottom: 8px; color: #22E3A1;">Thank You!</h1>
              
              <p style="text-align: center; font-size: 16px; margin-bottom: 32px; color: rgba(255,255,255,0.72);">Here's your reward for supporting MixMind</p>

              <!-- Coupon Code Box -->
              <div style="background: linear-gradient(135deg, rgba(34,227,161,0.15) 0%, rgba(34,227,161,0.05) 100%); border: 2px solid rgba(34,227,161,0.3); border-radius: 16px; padding: 24px; margin-bottom: 24px; text-align: center;">
                <p style="font-size: 12px; font-weight: 600; color: rgba(34,227,161,0.8); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">Your Coupon Code</p>
                
                <div style="background: rgba(0,0,0,0.3); padding: 16px; border-radius: 12px; margin-bottom: 12px;">
                  <p class="font-display" style="font-size: 24px; font-weight: 700; color: #22E3A1; letter-spacing: 2px; word-break: break-all; margin: 0;">${couponCode}</p>
                </div>

                <p style="font-size: 14px; font-weight: 600; color: #22E3A1; margin-bottom: 4px;">Save £${discount} on Your Next Request!</p>
                <p style="font-size: 12px; color: rgba(34,227,161,0.7); margin: 0;">Expires in ${daysUntilExpiry} days (${expiresAt.toLocaleDateString()})</p>
              </div>

              <!-- Details -->
              <div style="background: rgba(168,85,247,0.08); border: 1px solid rgba(168,85,247,0.2); border-radius: 12px; padding: 16px; margin-bottom: 24px; font-size: 13px;">
                <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.7);"><strong style="color: #FFFFFF;">How to use your coupon:</strong></p>
                <ul style="margin: 8px 0 0 20px; color: rgba(255,255,255,0.6); padding-left: 0;">
                  <li style="margin-bottom: 6px;">Visit the song request page</li>
                  <li style="margin-bottom: 6px;">Enter your coupon code at checkout</li>
                  <li>Save £${discount} on your request!</li>
                </ul>
              </div>

              <!-- Terms -->
              <div style="background: rgba(255,255,255,0.03); border-left: 3px solid rgba(168,85,247,0.3); border-radius: 4px; padding: 12px; margin-bottom: 24px; font-size: 12px;">
                <p style="margin: 0; color: rgba(255,255,255,0.5);"><strong style="color: rgba(255,255,255,0.7);">Terms:</strong> One coupon per request. Cannot be combined with other offers. Valid for ${daysUntilExpiry} days only.</p>
              </div>

              <a href="${REQUEST_PAGE_URL}" class="glow-button font-display" style="display: block; width: 100%; text-decoration: none; color: #FFFFFF; font-weight: 700; padding: 16px 0; border-radius: 16px; font-size: 14px; text-align: center; margin-bottom: 16px;">
                Use My Coupon Now
              </a>

              <p style="font-size: 12px; text-align: center; color: rgba(255,255,255,0.4); margin-top: 24px;">
                Questions? Visit our support page or reply to this email.
              </p>

              <p style="font-size: 11px; text-align: center; margin-top: 16px; color: rgba(255,255,255,0.3);">
                Keep supporting great music at your favorite venues!<br>
                — The MixMind Team
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    console.log(`   📧 Mail options created`);
    console.log(`   - From: ${mailOptions.from}`);
    console.log(`   - To: ${mailOptions.to}`);
    console.log(`   - Subject: ${mailOptions.subject}`);

    console.log(`   🔌 Creating transporter...`);
    const transporter = createTransporter();

    console.log(`   📤 Attempting to send email...`);
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`   ✅ Email sent successfully!`);
    console.log(`   - Message ID: ${info.messageId}`);
    console.log(`   - Response: ${info.response}`);
    
    return { success: true, message: "Coupon code email sent", messageId: info.messageId };
  } catch (err) {
    console.error(`\n❌ FAILED TO SEND COUPON EMAIL`);
    console.error(`   Error Type: ${err.name}`);
    console.error(`   Error Message: ${err.message}`);
    console.error(`   Error Code: ${err.code}`);
    if (err.response) console.error(`   SMTP Response: ${err.response}`);
    if (err.command) console.error(`   SMTP Command: ${err.command}`);
    console.error(`   Stack: ${err.stack}`);
    
    return { success: false, error: err.message, errorType: err.name };
  }
}

module.exports = {
  sendDJAcceptanceEmail,
  sendDJRejectionEmail,
  sendGenreRejectionEmail,
  sendWaitlistConfirmation,
  sendCouponCode
};