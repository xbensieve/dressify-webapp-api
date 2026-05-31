import {
  ProductModel,
  ProductVariationModel,
  ProductImageModel,
  type IProduct,
  type IProductVariation,
  type IProductImage,
} from './products.schema';
import { CategoryModel } from '@modules/categories/categories.schema';
import { getSkip } from '@shared/utils/pagination';
import { NotFoundError } from '@shared/errors/AppError';

export interface ProductWithDetails {
  _id: unknown;
  name: string;
  description: string;
  price: number;
  category_id: unknown;
  seller_id: unknown;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  variations: IProductVariation[];
  images: IProductImage[];
  category?: unknown;
}

export class ProductRepository {
  async search(params: {
    keyword: string;
    sortBy: string;
    page: number;
    limit: number;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<{ products: ProductWithDetails[]; total: number }> {
    const { keyword, sortBy, page, limit, minPrice, maxPrice } = params;

    const categoryIds = keyword
      ? (await CategoryModel.find({ name: { $regex: keyword, $options: 'i' } }).select('_id')).map((c) => c._id)
      : [];

    const query: Record<string, unknown> = {
      isDeleted: false,
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        ...(categoryIds.length > 0 ? [{ category_id: { $in: categoryIds } }] : []),
      ],
    };

    if (minPrice !== undefined || maxPrice !== undefined) {
      query['price'] = {
        ...(minPrice !== undefined ? { $gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { $lte: maxPrice } : {}),
      };
    }

    const sort: Record<string, 1 | -1> =
      sortBy === 'price_asc' ? { price: 1 } : sortBy === 'price_des' ? { price: -1 } : { createdAt: -1 };

    const [total, products] = await Promise.all([
      ProductModel.countDocuments(query),
      ProductModel.find(query).sort(sort).skip(getSkip({ page, limit })).limit(limit).lean(),
    ]);

    const productIds = products.map((p) => p._id);
    const [variations, images] = await Promise.all([
      ProductVariationModel.find({ product_id: { $in: productIds } }).lean(),
      ProductImageModel.find({ productId: { $in: productIds } }).lean(),
    ]);

    const enriched = products.map((product) => ({
      ...(product as unknown as IProduct),
      variations: (variations as unknown as IProductVariation[]).filter(
        (v) => String(v.product_id) === String(product._id),
      ),
      images: (images as unknown as IProductImage[]).filter(
        (img) => String(img.productId) === String(product._id),
      ),
    }));

    return { products: enriched, total };
  }

  async findById(id: string): Promise<ProductWithDetails> {
    const product = await ProductModel.findById(id).lean();
    if (!product || product.isDeleted) throw new NotFoundError('Product');

    const [variations, images, category] = await Promise.all([
      ProductVariationModel.find({ product_id: product._id }).lean(),
      ProductImageModel.find({ productId: product._id }).lean(),
      CategoryModel.findById(product.category_id).lean(),
    ]);

    return {
      ...(product as unknown as IProduct),
      variations: variations as unknown as IProductVariation[],
      images: images as unknown as IProductImage[],
      category,
    };
  }

  async create(
    data: Partial<IProduct>,
    variationsData: Partial<IProductVariation>[],
  ): Promise<{ product: IProduct; variations: IProductVariation[] }> {
    const product = await ProductModel.create(data);
    const savedVariations = await ProductVariationModel.insertMany(
      variationsData.map((v) => ({ ...v, product_id: product._id })),
    );
    return { product: product as unknown as IProduct, variations: savedVariations as unknown as IProductVariation[] };
  }

  async addImages(productId: string, imageDocs: Partial<IProductImage>[]): Promise<IProductImage[]> {
    const saved = await ProductImageModel.insertMany(imageDocs.map((img) => ({ ...img, productId })));
    return saved as unknown as IProductImage[];
  }

  async update(id: string, data: Partial<IProduct>): Promise<IProduct> {
    const product = await ProductModel.findByIdAndUpdate(id, data, { new: true });
    if (!product) throw new NotFoundError('Product');
    return product as unknown as IProduct;
  }

  async softDelete(id: string): Promise<void> {
    const product = await ProductModel.findByIdAndUpdate(id, { isDeleted: true });
    if (!product) throw new NotFoundError('Product');
  }
}
