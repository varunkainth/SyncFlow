import { Request, Response, Router } from 'express';
import UserController from '../controllers/user.controller';
import { uploadSingleImage } from '../middlewares/multer-cloudinary.middleware';

const router = Router();
const userController = new UserController();

// Get logged-in user's profile
router.route('/profile').get(async (req: Request, res: Response) => {
  userController.getProfile(req, res);
});

// Update logged-in user's profile
router.route('/profile').put(async (req: Request, res: Response) => {
  userController.updateProfile(req, res);
});

// Update profile picture with image upload middleware
router
  .route('/profile-picture')
  .put(
    uploadSingleImage('profileImage'),
    async (req: Request, res: Response) => {
      userController.updateProfilePicture(req, res);
    },
  );

// Get another user's profile by userId
router.route('/:userId').get(async (req: Request, res: Response) => {
  userController.getAnyUserProfile(req, res);
});

export default router;
