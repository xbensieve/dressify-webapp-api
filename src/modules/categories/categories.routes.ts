import { Router } from 'express';
import { verifyToken, requireAdmin } from '@shared/middleware/auth.middleware';
import * as categoriesController from './categories.controller';

const router = Router();

router.get('/', categoriesController.getAll);
router.get('/:id', categoriesController.getById);
router.post('/', verifyToken, requireAdmin, categoriesController.create);
router.put('/:id', verifyToken, requireAdmin, categoriesController.update);
router.delete('/:id', verifyToken, requireAdmin, categoriesController.remove);

export default router;
