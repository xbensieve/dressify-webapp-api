import { Router } from 'express';
import { verifyToken } from '@shared/middleware/auth.middleware';
import * as addressesController from './addresses.controller';

const router = Router();

router.use(verifyToken);
router.get('/', addressesController.getAll);
router.post('/', addressesController.create);
router.put('/:id', addressesController.update);
router.delete('/:id', addressesController.remove);
router.patch('/:id/default', addressesController.setDefault);

export default router;
