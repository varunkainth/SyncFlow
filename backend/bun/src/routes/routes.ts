import { Router, Request, Response } from 'express';

const router = Router();

// Example route
router.get('/hello', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Hello from the Bun backend!' });
});

export default router;