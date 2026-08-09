import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../shared/httpError.js';
import {
  createRoomController,
  joinRoomController,
  listRoomsController,
  lockRoomController
} from './roomController.js';

export const roomRouter = Router();

roomRouter.use(requireAuth);
roomRouter.get('/', asyncHandler(listRoomsController));
roomRouter.post('/', asyncHandler(createRoomController));
roomRouter.post('/:roomId/join', asyncHandler(joinRoomController));
roomRouter.patch('/:roomId/lock', asyncHandler(lockRoomController));

