import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import * as categoriesService from '@modules/categories/categories.service';
import { CategoryModel } from '@modules/categories/categories.schema';

describe('CategoriesService Unit Tests', () => {
  beforeEach(async () => {
    await CategoryModel.init();
    await CategoryModel.deleteMany({});
  });

  describe('createCategory', () => {
    it('should create a category successfully', async () => {
      const cat = await categoriesService.createCategory('T-shirts', 'Cool t-shirts');
      expect(cat).toBeTruthy();
      expect(cat.name).toBe('T-shirts');
      expect(cat.description).toBe('Cool t-shirts');

      const found = await CategoryModel.findById(cat._id);
      expect(found).toBeTruthy();
      expect(found!.name).toBe('T-shirts');
    });

    it('should throw ConflictError if category name already exists', async () => {
      await categoriesService.createCategory('Jeans');
      await expect(
        categoriesService.createCategory('Jeans', 'Another description'),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });
  });

  describe('getAllCategories', () => {
    it('should return empty list when no categories exist', async () => {
      const list = await categoriesService.getAllCategories();
      expect(list).toHaveLength(0);
    });

    it('should return all categories', async () => {
      await CategoryModel.insertMany([
        { name: 'Shirts' },
        { name: 'Pants' },
      ]);

      const list = await categoriesService.getAllCategories();
      expect(list).toHaveLength(2);
      expect(list.map((c) => c.name)).toContain('Shirts');
      expect(list.map((c) => c.name)).toContain('Pants');
    });
  });

  describe('getCategoryById', () => {
    it('should throw NotFoundError if category does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        categoriesService.getCategoryById(fakeId),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should return the correct category by id', async () => {
      const cat = await CategoryModel.create({ name: 'Accessories' });
      const found = await categoriesService.getCategoryById(cat._id.toString());
      expect(found).toBeTruthy();
      expect(found.name).toBe('Accessories');
    });
  });

  describe('updateCategory', () => {
    it('should throw NotFoundError if category to update does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        categoriesService.updateCategory(fakeId, { name: 'New Name' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should update a category successfully', async () => {
      const cat = await CategoryModel.create({ name: 'Old Shoes', description: 'Old style' });
      const updated = await categoriesService.updateCategory(cat._id.toString(), {
        name: 'New Shoes',
        description: 'New style',
      });

      expect(updated.name).toBe('New Shoes');
      expect(updated.description).toBe('New style');

      const found = await CategoryModel.findById(cat._id);
      expect(found!.name).toBe('New Shoes');
    });
  });

  describe('deleteCategory', () => {
    it('should throw NotFoundError if category to delete does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        categoriesService.deleteCategory(fakeId),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should delete a category successfully', async () => {
      const cat = await CategoryModel.create({ name: 'DeleteMe' });
      await categoriesService.deleteCategory(cat._id.toString());

      const found = await CategoryModel.findById(cat._id);
      expect(found).toBeNull();
    });
  });
});
