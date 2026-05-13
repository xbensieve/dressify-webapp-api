import { CategoryModel, type ICategory } from './categories.schema';
import { ConflictError, NotFoundError } from '@shared/errors/AppError';
import { createModuleLogger } from '@shared/logger/createModuleLogger';

const log = createModuleLogger('categories.service');

export const getAllCategories = async (): Promise<ICategory[]> => {
  log.debug('Fetching all categories');
  return CategoryModel.find().lean() as unknown as Promise<ICategory[]>;
};

export const getCategoryById = async (id: string): Promise<ICategory> => {
  const cat = (await CategoryModel.findById(id).lean()) as unknown as ICategory | null;
  if (!cat) { log.warn({ categoryId: id }, 'Category not found'); throw new NotFoundError('Category'); }
  return cat;
};

export const createCategory = async (name: string, description?: string): Promise<ICategory> => {
  log.info({ name }, 'Creating category');
  try {
    const cat = (await CategoryModel.create({ name, description })) as unknown as ICategory;
    log.info({ categoryId: String(cat._id), name }, 'Category created');
    return cat;
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000) {
      log.warn({ name }, 'Category name conflict');
      throw new ConflictError('Category name already exists');
    }
    throw err;
  }
};

export const updateCategory = async (id: string, data: Partial<ICategory>): Promise<ICategory> => {
  log.info({ categoryId: id }, 'Updating category');
  const cat = await CategoryModel.findByIdAndUpdate(id, data, { new: true });
  if (!cat) { log.warn({ categoryId: id }, 'Category not found for update'); throw new NotFoundError('Category'); }
  return cat as unknown as ICategory;
};

export const deleteCategory = async (id: string): Promise<void> => {
  log.info({ categoryId: id }, 'Deleting category');
  const cat = await CategoryModel.findByIdAndDelete(id);
  if (!cat) { log.warn({ categoryId: id }, 'Category not found for delete'); throw new NotFoundError('Category'); }
};
