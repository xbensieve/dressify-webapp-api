import { describe, it, expect, vi } from 'vitest';
import * as productsService from '@modules/products/products.service';
import { ProductModel, ProductVariationModel } from '@modules/products/products.schema';
import { CategoryModel } from '@modules/categories/categories.schema';

describe('ProductsService', () => {
  describe('addProduct', () => {
    it('should create a product with variations', async () => {
      // Create a category first
      const category = await CategoryModel.create({ name: 'Test Category' });

      vi.mock('@infrastructure/storage/cloudinary.js', () => ({
        uploadToCloudinary: vi.fn().mockResolvedValue({
          secure_url: 'https://cloudinary.com/test.jpg',
          public_id: 'test/image',
        }),
      }));

      const result = await productsService.addProduct(
        '507f1f77bcf86cd799439011',
        { name: 'Test Product', description: 'Desc', price: 100, category_id: String(category._id) },
        [{ size: 'M', color: 'Red', price: 100, stock_quantity: 10 }],
        [], // No file uploads in unit test
      );

      expect(result.product).toBeTruthy();
      expect(result.product.name).toBe('Test Product');
      expect(result.variations).toHaveLength(1);
    });
  });

  describe('searchProducts', () => {
    it('should return paginated products', async () => {
      const category = await CategoryModel.create({ name: 'Search Category' });
      await ProductModel.insertMany([
        { name: 'Shirt Red', description: 'A shirt', price: 50, category_id: category._id, seller_id: '507f1f77bcf86cd799439011' },
        { name: 'Pants Blue', description: 'Some pants', price: 80, category_id: category._id, seller_id: '507f1f77bcf86cd799439011' },
      ]);

      const result = await productsService.searchProducts({ keyword: 'Shirt', page: 1, limit: 10 });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]).toMatchObject({ name: 'Shirt Red' });
    });

    it('should return empty results for no matches', async () => {
      const result = await productsService.searchProducts({ keyword: 'NonExistentXYZ' });
      expect(result.data).toHaveLength(0);
      expect(result.pagination.totalItems).toBe(0);
    });
  });
});
