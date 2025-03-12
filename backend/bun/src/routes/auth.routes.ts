import { Router, Request, Response } from 'express';
import AuthController from '../controllers/auth.controller';

const router = Router();

const authController = new AuthController();

// POST /api/auth/login
router.route('/login').post(async (req: Request, res: Response) => {
  await authController.login(req, res);
});

router.route('/register').post(async (req: Request, res: Response) => {
  await authController.register(req, res);
});

router.route('/refresh').post(async (req: Request, res: Response) => {
  await authController.refreshToken(req, res);
});

router.route('/logout').post(async (req: Request, res: Response) => {
  await authController.logout(req, res);
});


export default router;
