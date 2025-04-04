import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { LoginInput, RegisterInput } from '../types/auth.types';
import { comparePassword, hashPassword } from '../utils/hashPassword.utils';
import {
  generateAccessToken,
  generateRefreshToken,
  generatetoken,
  verifyRefreshToken,
  verifyToken,
} from '../utils/token.utils';
import { UserInput } from '../types/user.types';
import Sentry from '../config/sentry.config';
import {
  sendPasswordResetMail,
  sendTwoFactorAuthMail,
  sendWelcomeMail,
} from '../utils/sendMail.utils';
import redis from '../config/redis.config';
import speakeasy from 'speakeasy';

// Create a single PrismaClient instance and reuse it
const prisma = new PrismaClient();

class AuthController {
  async register(req: Request, res: Response) {
    try {
      const {
        email,
        password,
        username,
        firstname,
        lastname,
        gender,
        phone
      }: RegisterInput = req.body;

      // Validate input
      if (
        !email ||
        !password ||
        !username ||
        !firstname ||
        !lastname ||
        !gender ||
        !phone
      ) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required.',
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { phone },
          ],
        },
      });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists.',
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Use a transaction to ensure data consistency
      const result = await prisma.$transaction(async (tx) => {
        // Create new user with proper fields
        const newUser = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            username: username,
            phone,
            profile: {
              create: {
                firstName: firstname,
                lastName: lastname,
                gender,
              },
            },
          },
          select: {
            id: true,
            email: true,
            isEmailVerified: true,
            phone:true,
            createdAt: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                gender: true,
                avatarUrl: true,
                bio: true,
              },
            },
          },
        });
        const ip = Array.isArray(req.headers['x-forwarded-for'])
          ? req.headers['x-forwarded-for'][0]
          : req.ip || req.headers['x-forwarded-for'] || 'unknown';

        const userAgent = req.headers['user-agent'] || 'unknown';

        const 

        // Create session
        const session = await tx.session.create({
          data: {
            userId: newUser.id,
            ipAddress: ip as string,
            userAgent: userAgent as string,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
          },
        });

        await redis.hset(`session: ${session.id}`, {
          userId: newUser.id,
          ipAddress: ip as string,
          userAgent: userAgent as string,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
        });

        // Create audit log entry
        await tx.auditLog.create({
          data: {
            action: 'USER_REGISTERED',
            details: `New user registered: ${newUser.email}`,
            userId: newUser.id,
            ipAddress: ip as string,
          },
        });

        return newUser;
      });

      const user = {
        userId: result.id,
        email: result.email,
        roles: [],
        permissions: [],
      };

      // Token generation and response will be implemented in a future update

      const token = generateAccessToken(user);

      res.setHeader('Authorization', `Bearer ${token}`);

      const refreshToken = generateRefreshToken(user.userId);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      });

      // Send welcome email to new user
      const verificationToken = await generatetoken(result.email);
      const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

      await sendWelcomeMail(
        result.email,
        `${result.profile?.firstName} ${result.profile?.lastName}`,
        verificationLink,
      );

      // Return success response with safe user data
      return res.status(201).json({
        success: true,
        message: 'User registered successfully.',
        data: result,
      });
    } catch (error: any) {
      // Better error handling with specific error codes
      console.error('Registration error:', error);
      Sentry.captureException(error);
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists.',
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Registration failed. Please try again later.',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password }: LoginInput = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required.',
        });
      }

      // Find user with associated profile
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          isEmailVerified: true,
          isLocked: true,
          failedAttempts: true,
          lastLoginAt: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
              avatarUrl: true,
              bio: true,
            },
          },
        },
      });

      // Check if user exists
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found.',
        });
      }

      // Check if the account is locked
      if (user.isLocked) {
        return res.status(403).json({
          success: false,
          message: 'Account is locked due to multiple failed login attempts.',
        });
      }

      // Verify password
      const passwordMatch = await comparePassword(password, user.password);
      if (!passwordMatch) {
        // Increment failed attempts and lock account if necessary
        await prisma.user.update({
          where: { email },
          data: {
            failedAttempts: (user.failedAttempts || 0) + 1,
            isLocked: (user.failedAttempts || 0) + 1 >= 5, // Lock after 5 failed attempts
          },
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid credentials.',
        });
      }

      // Reset failed attempts on successful login
      await prisma.user.update({
        where: { email },
        data: {
          failedAttempts: 0,
          lastLoginAt: new Date(),
        },
      });

      // Generate access & refresh tokens
      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
      });
      const refreshToken = generateRefreshToken(user.id);

      const userAgent = req.headers['user-agent'] || 'unknown';
      const ip = Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.ip || req.headers['x-forwarded-for'] || 'unknown';
      // Create session
      const session = await prisma.session.create({
        data: {
          userId: user.id,
          ipAddress: ip as string,
          userAgent: userAgent as string,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
        },
      });

      await redis.hset(`session: ${session.id}`, {
        userId: user.id,
        ipAddress: ip as string,
        userAgent: userAgent as string,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
      });

      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          action: 'USER_LOGGED_IN',
          details: `User logged in: ${user.email}`,
          userId: user.id,
          ipAddress: req.ip || 'unknown',
        },
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      });

      res.setHeader('Authorization', `Bearer ${accessToken}`);

      // Return user data with tokens
      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: {
          user: {
            id: user.id,
            email: user.email,
            isEmailVerified: user.isEmailVerified,
            lastLoginAt: user.lastLoginAt,
            profile: user.profile,
          },
          refreshToken: refreshToken,
        },
      });
    } catch (error: any) {
      console.error('Login error:', error);
      Sentry.captureException(error);
      return res.status(500).json({
        success: false,
        message: 'Login failed. Please try again later.',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      // Placeholder for logout method implementation
      // Will be implemented in a future update

      // Clear refresh token cookie
      res.clearCookie('refreshToken');
      res.removeHeader('Authorization');

      return res.status(200).json({
        success: true,
        message: 'Logout successful.',
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      Sentry.captureException(error);
      return res.status(500).json({
        success: false,
        message: 'Logout failed. Please try again later.',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      // request token from body or cookie
      const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

      // verify token
      const decoder = verifyRefreshToken(refreshToken);
      if (!decoder) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token.',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: decoder.userId },
        select: {
          id: true,
          email: true,
          roles: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found.',
        });
      }

      // find roles

      const role = await prisma.role.findMany({
        where: {
          id: user.id,
        },
        select: {
          name: true,
        },
      });

      const validRoles: (
        | 'Admin'
        | 'Manager'
        | 'Developer'
        | 'Viewer'
        | 'Guest'
      )[] = role.map(
        (r) => r.name as 'Admin' | 'Manager' | 'Developer' | 'Viewer' | 'Guest',
      );

      const AccesssUser = {
        userId: user.id,
        email: user.email,
        roles: validRoles,
      };

      // generate new access token
      const accessToken = generateAccessToken(AccesssUser);

      // send new access token
      res.setHeader('Authorization', `Bearer ${accessToken}`);

      return res.status(200).json({
        success: true,
        message: 'Token refresh successful.',
        token: accessToken,
      });
    } catch (error: any) {
      console.error('Token refresh error:', error);
      Sentry.captureException(error);
      return res.status(500).json({
        success: false,
        message: 'Token refresh failed. Please try again later.',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Invalid token.',
        });
      }

      // Placeholder for email verification method implementation
      // Will be implemented in a future update

      const verify = await verifyToken(token as string);
      if (!verify) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token.',
        });
      }

      // Placeholder for email verification method implementation
      const user = await prisma.user.update({
        where: { email: verify },
        data: {
          isEmailVerified: true,
        },
        select: {
          id: true,
          email: true,
          isEmailVerified: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully.',
        data: user,
      });
    } catch (error: any) {
      console.error('Email verification error:', error);
      Sentry.captureException(error);
      return res.status(500).json({
        success: false,
        message: 'Email verification failed. Please try again later.',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  // Password Reset
  async forgetPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required.',
        });
      }
      // Generate a password reset token
      const token = generatetoken(email);

      // Send password reset email
      await sendPasswordResetMail(email, token);

      return res.status(200).json({
        success: true,
        message: 'Password reset email sent successfully.',
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      Sentry.captureException(error);
      return res.status(500).json({
        success: false,
        message: 'Password reset failed. Please try again later.',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
  // Password Reset Verify and Reset Password
  async passwordResetVerify(req: Request, res: Response) {
    try {
      const password = req.body.password;
      const token = (req.query.token as string) || req.body.token;

      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message: 'Token and password are required.',
        });
      }

      // Verify token
      const email = verifyToken(token);
      if (!email) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token.',
        });
      }

      // Hash new password
      const hashedPassword = await hashPassword(password);

      // Update user password
      const user = await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Password reset successfully.',
        data: user,
      });
    } catch (error: any) {
      console.error('Password reset verify error:', error);
      Sentry.captureException(error);
      return res.status(500).json({
        success: false,
        message: 'Password reset verify failed. Please try again later.',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
  // Password Change
  async changePassword(req: Request, res: Response) {
    try {
      const { oldPassword, newPassword } = req.body;
      const email = req.user?.email;

      if (!email || !oldPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Old password, and new password are required.',
        });
      }

      // Find user with associated profile
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
        },
      });

      // Check if user exists
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found.',
        });
      }

      // Verify old password
      const passwordMatch = await comparePassword(oldPassword, user.password);
      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid old password.',
        });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update user password
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Password changed successfully.',
        data: updatedUser,
      });
    } catch (error: any) {
      console.error('Change password error:', error);
      Sentry.captureException(error);
      return res.status(500).json({
        success: false,
        message: 'Password change failed. Please try again later.',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
  // Resend EmaIl Verification
  async resendEmailVerification(req: Request, res: Response) {
    try {
      const email = req.user?.email;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required.',
        });
      }

      // Generate a new verification token
      const token = generatetoken(email);

      // Send verification email
      await sendWelcomeMail(email, email, token);

      return res.status(200).json({
        success: true,
        message: 'Verification email sent successfully.',
      });
    } catch (error: any) {
      console.error('Resend email verification error:', error);
      Sentry.captureException(error);
      return res.status(500).json({
        success: false,
        message: 'Resend email verification failed. Please try again later.',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
  // Get All Sessions
  async getAllSessions(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required.',
        });
      }

      // Find all sessions for the user
      const sessions = await prisma.session.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({
        success: true,
        message: 'Sessions retrieved successfully.',
        data: sessions,
      });
    } catch (error: any) {
      console.error('Get all sessions error:', error);
      Sentry.captureException(error);
      return res.status(500).json({
        success: false,
        message: 'Get all sessions failed. Please try again later.',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
  // Revoke Session
  async revokeSession(req: Request, res: Response) {
    try {
      const sessionId = req.params.id;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required.',
        });
      }

      // Revoke session
      await prisma.session.delete({
        where: { id: sessionId },
      });

      return res.status(200).json({
        success: true,
        message: 'Session revoked successfully.',
      });
    } catch (error: any) {
      console.error('Revoke session error:', error);
      Sentry.captureException(error);
      return res.status(500).json({
        success: false,
        message: 'Revoke session failed. Please try again later.',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
  // Revoke All Sessions
  async revokeAllSessions(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required.',
        });
      }

      // Revoke all sessions for the user
      await prisma.session.deleteMany({
        where: { userId },
      });

      return res.status(200).json({
        success: true,
        message: 'All sessions revoked successfully.',
      });
    } catch (error: any) {
      console.error('Revoke all sessions error:', error);
      Sentry.captureException(error);
      return res.status(500).json({
        success: false,
        message: 'Revoke all sessions failed. Please try again later.',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  // setTwoFactor

  async setTwoFactor(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required.',
        });
      }

      // Generate a new two-factor authentication secret
      const secret = speakeasy.generateSecret({
        length: 20,
        name: 'SyncFlow',
      });

      // Save the secret to the user's profile
      // Upsert TwoFactorSettings (create if not exists, update if exists)
      const twoFactorSettings = await prisma.twoFactorSettings.upsert({
        where: { userId },
        update: {
          authAppEnabled: true,
          authAppSecret: secret.base32,
          authAppSecretUrl: secret.otpauth_url,
        },
        create: {
          userId,
          authAppEnabled: true,
          authAppSecret: secret.base32,
          authAppSecretUrl: secret.otpauth_url,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Two-factor authentication setup successfully.',
        authAppSecretUrl: twoFactorSettings.authAppSecretUrl,
        authAppSecret: twoFactorSettings.authAppSecret,
      });
    } catch (error: any) {
      console.error('Set two-factor error:', error);
      Sentry.captureException(error);
      return res.status(500).json({
        success: false,
        message:
          'Set two-factor authentication failed. Please try again later.',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  // Verify Two Factor
  async verifyTwoFactor(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { token } = req.body;

      if (!userId || !token) {
        return res.status(400).json({
          success: false,
          message: 'User ID and token are required.',
        });
      }

      // Find the user's two-factor settings
      const twoFactorSettings = await prisma.twoFactorSettings.findUnique({
        where: { userId },
      });

      if (!twoFactorSettings) {
        return res.status(404).json({
          success: false,
          message: 'Two-factor authentication not set up.',
        });
      }

      // Verify the token
      const verified = speakeasy.totp.verify({
        secret: twoFactorSettings.authAppSecret || '',
        encoding: 'base32',
        token,
      });

      if (!verified) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Two-factor authentication verified successfully.',
      });
    } catch (error: any) {
      console.error('Verify two-factor error:', error);
      Sentry.captureException(error);
      return res.status(500).json({
        success: false,
        message:
          'Verify two-factor authentication failed. Please try again later.',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
  // Disable Two Factor
  async disableTwoFactor(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required.',
        });
      }

      // Disable two-factor authentication
      await prisma.twoFactorSettings.update({
        where: { userId },
        data: {
          authAppEnabled: false,
          authAppSecret: '',
          authAppSecretUrl: '',
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Two-factor authentication disabled successfully.',
      });
    } catch (error: any) {
      console.error('Disable two-factor error:', error);
      Sentry.captureException(error);
      return res.status(500).json({
        success: false,
        message:
          'Disable two-factor authentication failed. Please try again later.',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  // Enable Email Otp TwoStep
  async enableEmailOtp(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required.',
        });
      }

      // Enable email OTP
      await prisma.twoFactorSettings.update({
        where: { userId },
        data: {
          emailEnabled: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Email OTP enabled successfully.',
      });
    } catch (error: any) {
      console.error('Enable email OTP error:', error);
      Sentry.captureException(error);
      return res.status(500).json({
        success: false,
        message: 'Enable email OTP failed. Please try again later.',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
  // Disable Email Otp TwoStep
  async disableEmailOtp(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required.',
        });
      }

      // Disable email OTP
      await prisma.twoFactorSettings.update({
        where: { userId },
        data: {
          emailEnabled: false,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Email OTP disabled successfully.',
      });
    } catch (error: any) {
      console.error('Disable email OTP error:', error);
      Sentry.captureException(error);
      return res.status(500).json({
        success: false,
        message: 'Disable email OTP failed. Please try again later.',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
  // Enable Phone Otp TwoStep
  async enablePhoneOtp(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required.',
        });
      }

      // Enable phone OTP
      await prisma.twoFactorSettings.update({
        where: { userId },
        data: {
          otpEnabled: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Phone OTP enabled successfully.',
      });
    } catch (error: any) {
      console.error('Enable phone OTP error:', error);
      Sentry.captureException(error);
      return res.status(500).json({
        success: false,
        message: 'Enable phone OTP failed. Please try again later.',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
  // Disable Phone Otp TwoStep
  async disablePhoneOtp(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required.',
        });
      }

      // Disable phone OTP
      await prisma.twoFactorSettings.update({
        where: { userId },
        data: {
          otpEnabled: false,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Phone OTP disabled successfully.',
      });
    } catch (error: any) {
      console.error('Disable phone OTP error:', error);
      Sentry.captureException(error);
      return res.status(500).json({
        success: false,
        message: 'Disable phone OTP failed. Please try again later.',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
  // Send Email Otp
  async sendEmailOtp(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const email = req.user?.email;
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required.',
        });
      }

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required.',
        });
      }

      // Generate a new email OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Send email OTP
      await sendTwoFactorAuthMail(email, otp);
      // Store OTP in Redis with a 5-minute expiration
      await redis.set(`emailOtp:${userId}`, otp, 'EX', 300); // 5 minutes
      // Store OTP in database
      await prisma.twoFactorSettings.update({
        where: { userId },
        data: {
          emailCode: otp,
        },
      });
      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          action: 'EMAIL_OTP_SENT',
          details: `Email OTP sent to user: ${email}`,
          userId,
          ipAddress: req.ip || 'unknown',
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Email OTP sent successfully.',
        otp,
      });
    } catch (error: any) {
      console.error('Send email OTP error:', error);
      Sentry.captureException(error);
      return res.status(500).json({
        success: false,
        message: 'Send email OTP failed. Please try again later.',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
}

export default AuthController;
