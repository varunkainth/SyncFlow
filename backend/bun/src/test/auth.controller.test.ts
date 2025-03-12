import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import AuthController from '../controllers/auth.controller';
import * as hashUtils from '../utils/hashPassword.utils';
import * as tokenUtils from '../utils/token.utils';
import Sentry from '../config/sentry.config';
import { expect, jest } from '@jest/globals';

// Mock dependencies
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    role: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback: (prisma: typeof mockPrismaClient) => Promise<any>) => callback(mockPrismaClient)),
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

jest.mock('../utils/hashPassword.utils');
jest.mock('../utils/token.utils');
jest.mock('../config/sentry.config', () => ({
  captureException: jest.fn(),
}));

// Test setup
describe('AuthController', () => {
  let authController: AuthController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let prisma: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create AuthController instance
    authController = new AuthController();

    // Setup mock request and response
    mockReq = {
      body: {},
      ip: '127.0.0.1',
      cookies: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis() as unknown as (code: number) => Response,
      json: jest.fn().mockReturnThis() as unknown as Response['json'],
      setHeader: jest.fn() as unknown as (name: string, value: string | number | readonly string[]) => Response,
      cookie: jest.fn() as unknown as (name: string, val: any, options?: any) => Response,
      clearCookie: jest.fn() as unknown as (name: string, options?: any) => Response,
      removeHeader: jest.fn(),
    };

    // Get PrismaClient instance
    prisma = new PrismaClient();
  });

  describe('register', () => {
    const validRegisterData = {
      email: 'test@example.com',
      password: 'Password123!',
      username: 'testuser',
      firstname: 'Test',
      lastname: 'User',
      gender: 'Male',
    };

    it('should register a new user successfully', async () => {
      // Setup request
      mockReq.body = validRegisterData;

      // Mock hash password
      const hashedPassword = 'hashedpassword123';
      (hashUtils.hashPassword as jest.Mock).mockResolvedValue(hashedPassword);

      // Mock user creation
      const mockCreatedUser = {
        id: 'user-id-123',
        email: validRegisterData.email,
        isEmailVerified: false,
        createdAt: new Date(),
        profile: {
          firstName: validRegisterData.firstname,
          lastName: validRegisterData.lastname,
          gender: validRegisterData.gender,
          avatarUrl: null,
          bio: null,
        },
      };
      prisma.user.findUnique.mockResolvedValue(null); // No existing user
      prisma.user.create.mockResolvedValue(mockCreatedUser);
      prisma.$transaction.mockImplementation((callback: (arg0: any) => any) => callback(prisma));

      // Mock token generation
      const mockToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';
      (tokenUtils.generateAccessToken as jest.Mock).mockReturnValue(mockToken);
      (tokenUtils.generateRefreshToken as jest.Mock).mockReturnValue(mockRefreshToken);

      // Call register method
      await authController.register(mockReq as Request, mockRes as Response);

      // Assertions
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: validRegisterData.email } });
      expect(hashUtils.hashPassword).toHaveBeenCalledWith(validRegisterData.password);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'USER_REGISTERED',
          userId: mockCreatedUser.id,
        }),
      });
      expect(tokenUtils.generateAccessToken).toHaveBeenCalledWith(expect.objectContaining({
        userId: mockCreatedUser.id,
        email: mockCreatedUser.email,
      }));
      expect(tokenUtils.generateRefreshToken).toHaveBeenCalledWith(mockCreatedUser.id);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Authorization', `Bearer ${mockToken}`);
      expect(mockRes.cookie).toHaveBeenCalledWith('refreshToken', mockRefreshToken, expect.any(Object));
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully.',
        data: mockCreatedUser,
      });
    });

    it('should return 400 when required fields are missing', async () => {
      // Setup request with missing fields
      mockReq.body = {
        email: 'test@example.com',
        password: 'Password123!',
        // Missing other fields
      };

      // Call register method
      await authController.register(mockReq as Request, mockRes as Response);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'All fields are required.',
      });
    });

    it('should return 409 when user already exists', async () => {
      // Setup request
      mockReq.body = validRegisterData;

      // Mock existing user
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-user-id' });

      // Call register method
      await authController.register(mockReq as Request, mockRes as Response);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User with this email already exists.',
      });
    });

    it('should handle database unique constraint error', async () => {
      // Setup request
      mockReq.body = validRegisterData;

      // Mock hash password
      (hashUtils.hashPassword as jest.Mock).mockResolvedValue('hashedpassword123');

      // Mock user creation - no existing user found in check
      prisma.user.findUnique.mockResolvedValue(null);

      // But then throws unique constraint error during creation
      prisma.$transaction.mockRejectedValue({ code: 'P2002', message: 'Unique constraint failed' });

      // Call register method
      await authController.register(mockReq as Request, mockRes as Response);

      // Assertions
      expect(Sentry.captureException).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User with this email already exists.',
      });
    });

    it('should handle general server errors during registration', async () => {
      // Setup environment
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Setup request
      mockReq.body = validRegisterData;

      // Mock hash password
      (hashUtils.hashPassword as jest.Mock).mockResolvedValue('hashedpassword123');

      // Mock general error
      const error = new Error('Database connection failed');
      prisma.user.findUnique.mockRejectedValue(error);

      // Call register method
      await authController.register(mockReq as Request, mockRes as Response);

      // Assertions
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Registration failed. Please try again later.',
        error: 'Database connection failed',
      });

      // Restore environment
      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    const mockUser = {
      id: 'user-id-123',
      email: 'test@example.com',
      password: 'hashed-password',
      isEmailVerified: true,
      isLocked: false,
      failedAttempts: 0,
      lastLoginAt: null,
      profile: {
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        bio: null,
      },
    };

    it('should login the user successfully', async () => {
      // Setup request
      mockReq.body = validLoginData;

      // Mock user retrieval
      prisma.user.findUnique.mockResolvedValue(mockUser);

      // Mock password comparison
      (hashUtils.comparePassword as jest.Mock).mockResolvedValue(true);

      // Mock token generation
      const mockToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';
      (tokenUtils.generateAccessToken as jest.Mock).mockReturnValue(mockToken);
      (tokenUtils.generateRefreshToken as jest.Mock).mockReturnValue(mockRefreshToken);

      // Call login method
      await authController.login(mockReq as Request, mockRes as Response);

      // Assertions
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: validLoginData.email },
        select: expect.any(Object),
      });
      expect(hashUtils.comparePassword).toHaveBeenCalledWith(validLoginData.password, mockUser.password);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email: validLoginData.email },
        data: {
          failedAttempts: 0,
          lastLoginAt: expect.any(Date),
        },
      });
      expect(tokenUtils.generateAccessToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
      });
      expect(tokenUtils.generateRefreshToken).toHaveBeenCalledWith(mockUser.id);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'USER_LOGGED_IN',
          userId: mockUser.id,
        }),
      });
      expect(mockRes.cookie).toHaveBeenCalledWith('refreshToken', mockRefreshToken, expect.any(Object));
      expect(mockRes.setHeader).toHaveBeenCalledWith('Authorization', `Bearer ${mockToken}`);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful.',
        data: expect.objectContaining({
          user: expect.objectContaining({
            id: mockUser.id,
            email: mockUser.email,
          }),
          refreshToken: mockRefreshToken,
        }),
      });
    });

    it('should return 400 when email or password is missing', async () => {
      // Setup request with missing fields
      mockReq.body = {
        email: 'test@example.com',
        // Missing password
      };

      // Call login method
      await authController.login(mockReq as Request, mockRes as Response);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email and password are required.',
      });
    });

    it('should return 404 when user is not found', async () => {
      // Setup request
      mockReq.body = validLoginData;

      // Mock user retrieval - no user found
      prisma.user.findUnique.mockResolvedValue(null);

      // Call login method
      await authController.login(mockReq as Request, mockRes as Response);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found.',
      });
    });

    it('should return 403 when account is locked', async () => {
      // Setup request
      mockReq.body = validLoginData;

      // Mock user retrieval - locked account
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isLocked: true,
      });

      // Call login method
      await authController.login(mockReq as Request, mockRes as Response);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Account is locked due to multiple failed login attempts.',
      });
    });

    it('should return 401 and increment failed attempts for invalid password', async () => {
      // Setup request
      mockReq.body = validLoginData;

      // Mock user retrieval
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        failedAttempts: 2, // 3rd attempt will be made now
      });

      // Mock password comparison - incorrect password
      (hashUtils.comparePassword as jest.Mock).mockResolvedValue(false);

      // Call login method
      await authController.login(mockReq as Request, mockRes as Response);

      // Assertions
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email: validLoginData.email },
        data: {
          failedAttempts: 3, // Incremented
          isLocked: false, // Not yet locked (5 attempts needed)
        },
      });
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials.',
      });
    });

    it('should lock account after 5 failed attempts', async () => {
      // Setup request
      mockReq.body = validLoginData;

      // Mock user retrieval - 4 failed attempts already
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        failedAttempts: 4, // 5th attempt will be made now
      });

      // Mock password comparison - incorrect password
      (hashUtils.comparePassword as jest.Mock).mockResolvedValue(false);

      // Call login method
      await authController.login(mockReq as Request, mockRes as Response);

      // Assertions
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email: validLoginData.email },
        data: {
          failedAttempts: 5, // Incremented to 5
          isLocked: true, // Account should be locked
        },
      });
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should handle general server errors during login', async () => {
      // Setup environment
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Setup request
      mockReq.body = validLoginData;

      // Mock general error
      const error = new Error('Database connection failed');
      prisma.user.findUnique.mockRejectedValue(error);

      // Call login method
      await authController.login(mockReq as Request, mockRes as Response);

      // Assertions
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Login failed. Please try again later.',
        error: 'Database connection failed',
      });

      // Restore environment
      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('logout', () => {
    it('should logout the user successfully', async () => {
      // Call logout method
      await authController.logout(mockReq as Request, mockRes as Response);

      // Assertions
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(mockRes.removeHeader).toHaveBeenCalledWith('Authorization');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful.',
      });
    });

    it('should handle server errors during logout', async () => {
      // Setup environment
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Mock response to throw error
      mockRes.clearCookie = jest.fn().mockImplementation(() => {
        throw new Error('Cookie clearing failed');
      });

      // Call logout method
      await authController.logout(mockReq as Request, mockRes as Response);

      // Assertions
      expect(Sentry.captureException).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Logout failed. Please try again later.',
        error: 'Cookie clearing failed',
      });

      // Restore environment
      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully from cookie', async () => {
      // Setup request with refresh token in cookie
      mockReq.cookies = {
        refreshToken: 'valid-refresh-token',
      };

      // Mock token verification
      (tokenUtils.verifyRefreshToken as jest.Mock).mockReturnValue({
        userId: 'user-id-123',
      });

      // Mock user retrieval
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-id-123',
        email: 'test@example.com',
        roles: ['role-id-1'],
      });

      // Mock roles retrieval
      prisma.role.findMany.mockResolvedValue([
        { name: 'Admin' },
      ]);

      // Mock token generation
      const mockToken = 'new-access-token';
      (tokenUtils.generateAccessToken as jest.Mock).mockReturnValue(mockToken);

      // Call refreshToken method
      await authController.refreshToken(mockReq as Request, mockRes as Response);

      // Assertions
      expect(tokenUtils.verifyRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
        select: expect.any(Object),
      });
      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
        select: { name: true },
      });
      expect(tokenUtils.generateAccessToken).toHaveBeenCalledWith({
        userId: 'user-id-123',
        email: 'test@example.com',
        roles: ['Admin'],
      });
      expect(mockRes.setHeader).toHaveBeenCalledWith('Authorization', `Bearer ${mockToken}`);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Token refresh successful.',
        token: mockToken,
      });
    });

    it('should refresh token successfully from body', async () => {
      // Setup request with refresh token in body
      mockReq.body = {
        refreshToken: 'valid-refresh-token',
      };
      mockReq.cookies = {}; // No cookie

      // Mock token verification
      (tokenUtils.verifyRefreshToken as jest.Mock).mockReturnValue({
        userId: 'user-id-123',
      });

      // Mock user retrieval
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-id-123',
        email: 'test@example.com',
        roles: ['role-id-1'],
      });

      // Mock roles retrieval
      prisma.role.findMany.mockResolvedValue([
        { name: 'Developer' },
      ]);

      // Mock token generation
      const mockToken = 'new-access-token';
      (tokenUtils.generateAccessToken as jest.Mock).mockReturnValue(mockToken);

      // Call refreshToken method
      await authController.refreshToken(mockReq as Request, mockRes as Response);

      // Assertions
      expect(tokenUtils.verifyRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(tokenUtils.generateAccessToken).toHaveBeenCalledWith({
        userId: 'user-id-123',
        email: 'test@example.com',
        roles: ['Developer'],
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 401 for invalid refresh token', async () => {
      // Setup request
      mockReq.cookies = {
        refreshToken: 'invalid-refresh-token',
      };

      // Mock token verification - invalid token
      (tokenUtils.verifyRefreshToken as jest.Mock).mockReturnValue(null);

      // Call refreshToken method
      await authController.refreshToken(mockReq as Request, mockRes as Response);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired refresh token.',
      });
    });

    it('should return 404 when user not found', async () => {
      // Setup request
      mockReq.cookies = {
        refreshToken: 'valid-refresh-token',
      };

      // Mock token verification
      (tokenUtils.verifyRefreshToken as jest.Mock).mockReturnValue({
        userId: 'user-id-123',
      });

      // Mock user retrieval - no user found
      prisma.user.findUnique.mockResolvedValue(null);

      // Call refreshToken method
      await authController.refreshToken(mockReq as Request, mockRes as Response);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found.',
      });
    });

    it('should handle server errors during token refresh', async () => {
      // Setup environment
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Setup request
      mockReq.cookies = {
        refreshToken: 'valid-refresh-token',
      };

      // Mock token verification
      (tokenUtils.verifyRefreshToken as jest.Mock).mockReturnValue({
        userId: 'user-id-123',
      });

      // Mock general error
      const error = new Error('Database query failed');
      prisma.user.findUnique.mockRejectedValue(error);

      // Call refreshToken method
      await authController.refreshToken(mockReq as Request, mockRes as Response);

      // Assertions
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token refresh failed. Please try again later.',
        error: 'Database query failed',
      });

      // Restore environment
      process.env.NODE_ENV = originalNodeEnv;
    });
  });
});