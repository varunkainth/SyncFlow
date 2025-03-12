import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { LoginInput, RegisterInput } from '../types/auth.types';
import { comparePassword, hashPassword } from '../utils/hashPassword.utils';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/token.utils';
import { UserInput } from '../types/user.types';
import Sentry from '../config/sentry.config';

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
      }: RegisterInput = req.body;

      // Validate input
      if (
        !email ||
        !password ||
        !username ||
        !firstname ||
        !lastname ||
        !gender
      ) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required.',
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
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

        // Create audit log entry
        await tx.auditLog.create({
          data: {
            action: 'USER_REGISTERED',
            details: `New user registered: ${newUser.email}`,
            userId: newUser.id,
            ipAddress: req.ip || 'unknown',
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
}

export default AuthController;
