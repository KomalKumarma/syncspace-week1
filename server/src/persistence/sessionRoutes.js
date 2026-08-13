import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { getSessionSnapshot, listSessionSnapshots, saveSessionSnapshot } from './sessionStore.js';

export const sessionRouter = Router();

sessionRouter.use(requireAuth);

sessionRouter.get('/:roomId/snapshot', async (request, response, next) => {
  try {
    const snapshot = await getSessionSnapshot(request.params.roomId);

    if (!snapshot) {
      response.status(404).json({
        message: 'No snapshot saved for this room yet.'
      });
      return;
    }

    response.json(snapshot);
  } catch (error) {
    next(error);
  }
});

sessionRouter.post('/:roomId/snapshot', async (request, response, next) => {
  try {
    const snapshot = await saveSessionSnapshot(
      request.params.roomId,
      request.body,
      request.user?.sub || request.body?.createdBy
    );

    response.status(201).json(snapshot);
  } catch (error) {
    next(error);
  }
});

sessionRouter.get('/:roomId/replay', async (request, response, next) => {
  try {
    const snapshots = await listSessionSnapshots(request.params.roomId, request.query.limit);

    response.json({
      roomId: request.params.roomId,
      count: snapshots.length,
      snapshots
    });
  } catch (error) {
    next(error);
  }
});
