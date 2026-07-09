const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'DriveElite_Pr0d_JWT_S3cret_K3y_2026_V2_India_x9k2m';

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' }
});

const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'Too many requests. Please wait 5 minutes.' }
});

// Nodemailer SMTP Transporter setup
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  console.log('📧 Nodemailer Gmail Transporter configured');
} else {
  console.log('⚠️ Nodemailer running in local fallback mode (no SMTP configured in .env)');
}

async function sendEmailOTP(email, name, otp, isPhone = false) {
  const codeType = isPhone ? 'Mobile Verification Code' : 'Email Verification Code';
  const htmlContent = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0c0d19; padding: 40px; color: #f0f0ff; text-align: center; border-radius: 20px;">
      <h2 style="color: #3b82f6; font-size: 26px; font-weight: bold; margin-bottom: 5px;">DriveElite India</h2>
      <p style="color: #9898c8; font-size: 14px; margin-top: 0; margin-bottom: 25px;">Premium Car Rental Experience</p>
      <div style="background-color: #121324; border: 1px solid #232545; border-radius: 16px; padding: 30px; display: inline-block; min-width: 280px; box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
        <p style="font-size: 14px; color: #a0a5c1; margin-bottom: 10px; text-transform: uppercase; tracking: 1px;">${codeType}</p>
        <h1 style="font-size: 38px; color: #ffffff; letter-spacing: 6px; margin: 15px 0; font-family: monospace;">${otp}</h1>
        <p style="font-size: 12px; color: #6e7290; margin-top: 15px;">Valid for 10 minutes. Please do not share this code.</p>
      </div>
      <p style="color: #6e7290; font-size: 11px; margin-top: 30px;">This is an automated security verification email from DriveElite. If you did not request this, please ignore this email.</p>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"DriveElite Security" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `[DriveElite] Secure Verification Code: ${otp}`,
        html: htmlContent
      });
      console.log(`✅ Real email successfully sent to ${email}`);
    } catch (err) {
      console.error('❌ Failed to send real email via Nodemailer:', err.message);
    }
  } else {
    // Print fallback OTP in terminal
    console.log(`\n📧 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   [MOCK SMTP FALLBACK]`);
    console.log(`   Destination: ${email}`);
    console.log(`   Type:        ${codeType}`);
    console.log(`   OTP Code:    ${otp}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  }
}

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

function validatePasswordStrength(password) {
  const errors = [];
  if (password.length < 8) errors.push('at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('one number');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('one special character');
  return errors;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email.' });
    }

    const passwordErrors = validatePasswordStrength(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ success: false, message: `Password needs: ${passwordErrors.join(', ')}.` });
    }

    const cleanPhone = phone.replace(/[\s\-]/g, '');
    if (!/^(\+91)?[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid Indian phone number.' });
    }

    db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()], async (err, userByEmail) => {
      if (userByEmail) return res.status(409).json({ success: false, message: 'Email already registered.' });

      db.get('SELECT id FROM users WHERE phone = ?', [phone], async (err, userByPhone) => {
        if (userByPhone) return res.status(409).json({ success: false, message: 'Phone number already registered.' });

        const hashedPassword = await bcrypt.hash(password, 12);
        const emailOtp = generateOTP();
        const phoneOtp = generateOTP();
        const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        db.run(
          `INSERT INTO users (name, email, password, phone, email_verified, verification_otp, otp_expires_at, phone_verified, phone_otp, phone_otp_expires_at)
           VALUES (?, ?, ?, ?, 0, ?, ?, 0, ?, ?)`,
          [name, email.toLowerCase(), hashedPassword, phone, emailOtp, expiry, phoneOtp, expiry],
          async function (err) {
            if (err) return res.status(500).json({ success: false, message: 'Registration failed.' });

            const userId = this.lastID;
            const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

            // Send real email using Gmail SMTP for email verification
            await sendEmailOTP(email, name, emailOtp, false);
            // Send real email using Gmail SMTP for phone verification simulation as well so the user gets both!
            await sendEmailOTP(email, name, phoneOtp, true);

            res.status(201).json({
              success: true,
              message: 'Verification codes sent directly to your Gmail!',
              requireVerification: true,
              token,
              email_otp_hint: emailOtp,
              phone_otp_hint: phoneOtp,
              user: {
                id: userId,
                name,
                email: email.toLowerCase(),
                phone,
                role: 'user',
                email_verified: false,
                phone_verified: false
              }
            });
          }
        );
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', authenticateToken, (req, res) => {
  const { otp } = req.body;
  if (!otp || otp.length !== 6) return res.status(400).json({ success: false, message: 'Enter a valid 6-digit OTP.' });

  db.get('SELECT id, verification_otp, otp_expires_at, phone_verified FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.verification_otp !== otp) return res.status(400).json({ success: false, message: 'Invalid email OTP.' });
    if (new Date(user.otp_expires_at) < new Date()) return res.status(400).json({ success: false, message: 'OTP has expired.' });

    db.run(
      'UPDATE users SET email_verified = 1, verification_otp = NULL, otp_expires_at = NULL WHERE id = ?',
      [req.user.id],
      (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Update failed.' });
        res.json({
          success: true,
          message: 'Email verified!',
          email_verified: true,
          phone_verified: !!user.phone_verified
        });
      }
    );
  });
});

// POST /api/auth/verify-phone
router.post('/verify-phone', authenticateToken, (req, res) => {
  const { otp } = req.body;
  if (!otp || otp.length !== 6) return res.status(400).json({ success: false, message: 'Enter a valid 6-digit OTP.' });

  db.get('SELECT id, phone_otp, phone_otp_expires_at, email_verified FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.phone_otp !== otp) return res.status(400).json({ success: false, message: 'Invalid phone OTP.' });
    if (new Date(user.phone_otp_expires_at) < new Date()) return res.status(400).json({ success: false, message: 'OTP has expired.' });

    db.run(
      'UPDATE users SET phone_verified = 1, phone_otp = NULL, phone_otp_expires_at = NULL WHERE id = ?',
      [req.user.id],
      (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Update failed.' });
        res.json({
          success: true,
          message: 'Phone verified!',
          email_verified: !!user.email_verified,
          phone_verified: true
        });
      }
    );
  });
});

// POST /api/auth/resend-otp
router.post('/resend-otp', authenticateToken, otpLimiter, async (req, res) => {
  const { type } = req.body;
  const otp = generateOTP();
  const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  if (type === 'phone') {
    db.run(
      'UPDATE users SET phone_otp = ?, phone_otp_expires_at = ? WHERE id = ?',
      [otp, expiry, req.user.id],
      async (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Failed.' });
        await sendEmailOTP(req.user.email, req.user.name, otp, true);
        res.json({ success: true, message: 'New Phone OTP sent to your Gmail.', phone_otp_hint: otp });
      }
    );
  } else {
    db.run(
      'UPDATE users SET verification_otp = ?, otp_expires_at = ? WHERE id = ?',
      [otp, expiry, req.user.id],
      async (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Failed.' });
        await sendEmailOTP(req.user.email, req.user.name, otp, false);
        res.json({ success: true, message: 'New Email OTP sent to your Gmail.', email_otp_hint: otp });
      }
    );
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  db.get(
    'SELECT * FROM users WHERE email = ?',
    [email.toLowerCase()],
    async (err, user) => {
      if (err || !user) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const minLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
        return res.status(423).json({ success: false, message: `Locked. Try again in ${minLeft} minutes.` });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        const attempts = (user.login_attempts || 0) + 1;
        const locked_until = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
        db.run('UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?', [attempts, locked_until, user.id]);
        return res.status(401).json({ success: false, message: attempts >= 5 ? 'Locked for 15 minutes.' : 'Invalid credentials.' });
      }

      db.run('UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);

      if (!user.email_verified || !user.phone_verified) {
        const emailOtp = user.verification_otp || generateOTP();
        const phoneOtp = user.phone_otp || generateOTP();
        const expiry = user.otp_expires_at || new Date(Date.now() + 10 * 60 * 1000).toISOString();

        db.run(
          `UPDATE users SET verification_otp = ?, phone_otp = ?, otp_expires_at = ?, phone_otp_expires_at = ? WHERE id = ?`,
          [emailOtp, phoneOtp, expiry, expiry, user.id]
        );

        await sendEmailOTP(user.email, user.name, emailOtp, false);
        await sendEmailOTP(user.email, user.name, phoneOtp, true);

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

        return res.json({
          success: true,
          requireVerification: true,
          token,
          email_otp_hint: emailOtp,
          phone_otp_hint: phoneOtp,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            email_verified: !!user.email_verified,
            phone_verified: !!user.phone_verified
          }
        });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          email_verified: true,
          phone_verified: true
        }
      });
    }
  );
});

// GET /api/auth/profile
router.get('/profile', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
