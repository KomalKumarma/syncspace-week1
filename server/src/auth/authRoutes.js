import { Router } from 'express';
import { asyncHandler } from '../shared/httpError.js';
import { guestAccess, login, logout, refresh, register } from './authController.js';

export const authRouter = Router();

authRouter.post('/register', asyncHandler(register));
authRouter.post('/login', asyncHandler(login));
authRouter.post('/refresh', asyncHandler(refresh));
authRouter.post('/logout', asyncHandler(logout));
authRouter.post('/guest', asyncHandler(guestAccess));

