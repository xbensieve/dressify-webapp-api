import { CartModel, CartItemModel } from './cart.schema';
import { ProductModel } from '@modules/products/products.schema';
import { ProductVariationModel } from '@modules/products/products.schema';
import { ProductImageModel } from '@modules/products/products.schema';
import { NotFoundError, BadRequestError } from '@shared/errors/AppError';

const buildCartResponse = async (userId: string) => {
  const cart = await CartModel.findOne({ user_id: userId });
  if (!cart) throw new NotFoundError('Cart');

  const cartItems = await CartItemModel.find({ cart_id: cart._id })
    .populate('product_id')
    .populate('variation_id');

  const productIds = cartItems.map((item) => {
    const p = item.product_id as unknown as { _id: unknown };
    return p._id;
  });

  const productImages = await ProductImageModel.find({ productId: { $in: productIds } });

  const items = cartItems.map((item) => {
    const product = item.product_id as unknown as { _id: string; toObject?: () => Record<string, unknown>; [key: string]: unknown };
    const variation = item.variation_id as unknown as { toObject?: () => Record<string, unknown>; [key: string]: unknown };
    const productObj = product.toObject ? product.toObject() : product;
    const variationObj = variation.toObject ? variation.toObject() : variation;
    const images = productImages
      .filter((img) => img.productId.toString() === String(productObj._id))
      .map((img) => img.imageUrl);

    return { product: { ...productObj, images }, variation: variationObj, quantity: item.quantity, cartItemId: item._id };
  });

  return {
    ...cart.toObject(),
    total_price: cart.total_price,
    total_items: items.length,
    items,
  };
};

export const getCart = async (userId: string) => {
  return buildCartResponse(userId);
};

export const addToCart = async (
  userId: string,
  productId: string,
  variationId: string,
  quantity: number,
) => {
  if (!productId || !variationId || quantity <= 0)
    throw new BadRequestError('Invalid cart item data');

  const [product, variation] = await Promise.all([
    ProductModel.findById(productId),
    ProductVariationModel.findById(variationId),
  ]);

  if (!product) throw new NotFoundError('Product');
  if (!variation) throw new NotFoundError('Variation');

  let cart = await CartModel.findOne({ user_id: userId });
  if (!cart) cart = await CartModel.create({ user_id: userId });

  let cartItem = await CartItemModel.findOne({ cart_id: cart._id, product_id: productId, variation_id: variationId });

  if (cartItem) {
    cartItem.quantity += quantity;
    await cartItem.save();
  } else {
    cartItem = await CartItemModel.create({ cart_id: cart._id, product_id: productId, variation_id: variationId, quantity });
  }

  cart.total_price += variation.price * quantity;
  await cart.save();

  return buildCartResponse(userId);
};

export const updateCartItem = async (userId: string, cartItemId: string, quantity: number) => {
  const cartItem = await CartItemModel.findById(cartItemId);
  if (!cartItem) throw new NotFoundError('Cart item');

  const [cart, variation] = await Promise.all([
    CartModel.findById(cartItem.cart_id),
    ProductVariationModel.findById(cartItem.variation_id),
  ]);

  if (!cart) throw new NotFoundError('Cart');
  if (!variation) throw new NotFoundError('Variation');

  const oldQty = cartItem.quantity;
  cartItem.quantity = quantity;
  await cartItem.save();

  cart.total_price += (quantity - oldQty) * variation.price;
  await cart.save();

  return buildCartResponse(userId);
};

export const deleteCartItem = async (userId: string, cartItemId: string) => {
  const cartItem = await CartItemModel.findById(cartItemId);
  if (!cartItem) throw new NotFoundError('Cart item');

  const [cart, variation] = await Promise.all([
    CartModel.findById(cartItem.cart_id),
    ProductVariationModel.findById(cartItem.variation_id),
  ]);

  if (!cart) throw new NotFoundError('Cart');
  if (!variation) throw new NotFoundError('Variation');

  cart.total_price -= variation.price * cartItem.quantity;
  await Promise.all([cart.save(), CartItemModel.findByIdAndDelete(cartItemId)]);

  return buildCartResponse(userId);
};
