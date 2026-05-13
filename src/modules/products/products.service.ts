import { ProductRepository } from './products.repository';
import { uploadToCloudinary } from '@infrastructure/storage/cloudinary';
import { parsePagination, buildPaginatedResponse } from '@shared/utils/pagination';
import { createModuleLogger } from '@shared/logger/createModuleLogger';
import type { PaginatedResponse } from '@shared/types/api.types';
import type { ProductWithDetails } from './products.repository';

const log = createModuleLogger('products.service');
const productRepository = new ProductRepository();

export const searchProducts = async (
  query: Record<string, unknown>,
): Promise<PaginatedResponse<ProductWithDetails>> => {
  const { page, limit } = parsePagination(query);
  const keyword = String(query['keyword'] ?? '');
  const sortBy = String(query['sortBy'] ?? 'latest');
  const minPrice = query['minPrice'] ? Number(query['minPrice']) : undefined;
  const maxPrice = query['maxPrice'] ? Number(query['maxPrice']) : undefined;

  log.debug({ keyword, sortBy, page, limit, minPrice, maxPrice }, 'Searching products');

  const { products, total } = await productRepository.search({ keyword, sortBy, page, limit, minPrice, maxPrice });

  log.debug({ keyword, total, page }, 'Product search completed');
  return { success: true, ...buildPaginatedResponse(products, total, { page, limit }) };
};

export const getProductById = async (id: string): Promise<ProductWithDetails> => {
  log.debug({ productId: id }, 'Fetching product by ID');
  const product = await productRepository.findById(id);
  log.debug({ productId: id, name: product.name }, 'Product fetched');
  return product;
};

export const addProduct = async (
  sellerId: string,
  productData: Record<string, unknown>,
  variations: Record<string, unknown>[],
  files: Express.Multer.File[],
) => {
  log.info({ sellerId, productName: productData['name'], fileCount: files.length }, 'Adding new product');

  const { product, variations: savedVariations } = await productRepository.create(
    { ...productData, seller_id: sellerId as unknown as import('mongoose').Types.ObjectId },
    variations,
  );

  const imageDocs = await Promise.all(
    files.map(async (file, i) => {
      try {
        const result = await uploadToCloudinary(file.path, { folder: 'products' });
        log.debug({ productId: String(product._id), url: result.secure_url }, 'Image uploaded');
        return { productId: product._id, imageUrl: result.secure_url, altText: file.originalname, displayOrder: i, isPrimary: i === 0 };
      } catch (err) {
        log.error({ err, productId: String(product._id), file: file.originalname }, 'Image upload failed');
        throw err;
      }
    }),
  );

  const images = await productRepository.addImages(String(product._id), imageDocs);
  log.info({ productId: String(product._id), sellerId }, 'Product created successfully');
  return { product, variations: savedVariations, images };
};

export const updateProduct = async (id: string, data: Record<string, unknown>) => {
  log.info({ productId: id }, 'Updating product');
  const updated = await productRepository.update(id, data);
  log.info({ productId: id }, 'Product updated');
  return updated;
};

export const deleteProduct = async (id: string): Promise<void> => {
  log.info({ productId: id }, 'Soft-deleting product');
  await productRepository.softDelete(id);
  log.info({ productId: id }, 'Product deleted');
};
