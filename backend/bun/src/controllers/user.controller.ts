import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import _ from 'lodash';

const prisma = new PrismaClient();

class UserController {
  /**
   * Update user profile
   */
  async updateProfile(req: Request, res: Response) {
    try {
      const { firstName, lastName, bio, gender } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Remove undefined fields
      const updateData = _.omitBy(
        {
          firstName: firstName?.trim(),
          lastName: lastName?.trim(),
          bio: bio?.trim(),
          gender: gender?.trim(),
        },
        _.isUndefined,
      );

      if (Object.keys(updateData).length === 0) {
        return res
          .status(400)
          .json({ message: 'No valid data provided to update' });
      }

      // Transaction: Update profile + create audit log
      const [user] = await prisma.$transaction([
        prisma.profile.update({
          where: { userId },
          data: updateData,
        }),
        prisma.auditLog.create({
          data: {
            userId,
            action: 'Updated profile information',
            ipAddress: req.ip || '',
            details: JSON.stringify(updateData),
          },
        }),
      ]);

      return res.status(200).json({
        message: 'Profile updated successfully',
        user,
      });
    } catch (err:any) {
      console.error('Error updating profile:', err);
      return res
        .status(500)
        .json({ message: 'Internal server error', error: err.message });
    }
  }

  /**
   * Get logged-in user's profile
   */
  async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          roles: true,
          sessions: { select: { id: true, createdAt: true } },
          twoFactorSettings: true,
        },
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.status(200).json({ user });
    } catch (err:any) {
      console.error('Error getting profile:', err);
      return res
        .status(500)
        .json({ message: 'Internal server error', error: err.message });
    }
  }

  /**
   * Update profile picture
   */
  async updateProfilePicture(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!(req as any).fileDetails) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const profilePicture = (req as any).fileDetails.url; // Fixing array indexing issue

      // Transaction: Update profile + create audit log
      const [user] = await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: {
            profile: { update: { avatarUrl: profilePicture } },
          },
          select: {
            id: true,
            email: true,
            profile: { select: { avatarUrl: true } },
          },
        }),
        prisma.auditLog.create({
          data: {
            userId,
            action: 'Updated profile picture',
            ipAddress: req.ip || '',
            details: `Updated avatar to: ${profilePicture}`,
          },
        }),
      ]);

      return res.status(200).json({
        message: 'Profile picture updated successfully',
        user,
      });
    } catch (err:any) {
      console.error('Error updating profile picture:', err);
      return res
        .status(500)
        .json({ message: 'Internal server error', error: err.message });
    }
  }

  /**
   * Get any user's profile by userId
   */
  async getAnyUserProfile(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: {
            select: { firstName: true, lastName: true, avatarUrl: true },
          },
          roles: { select: { role: true, assignedBy: true } },
        },
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.status(200).json({ user });
    } catch (err:any) {
      console.error('Error getting user profile:', err);
      return res
        .status(500)
        .json({ message: 'Internal server error', error: err.message });
    }
  }
}

export default UserController;
