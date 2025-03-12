import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import morgon from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgon('dev'));
app.set('trust proxy', true); // Enable proxy trust in Express


app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

// Routes
import authRoutes from './routes/auth.routes.ts';

app.use('/api/auth', authRoutes);

export default app;
