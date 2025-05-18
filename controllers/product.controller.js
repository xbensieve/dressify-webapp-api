import Product from "../models/product.model.js";
import ProductVariation from "../models/productVariation.model.js";
import mongoose from "mongoose";
import cloudinary from "../utils/cloudinary.js";
import ProductImage from "../models/productImage.model.js";

export const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 1 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    const skip = (pageNumber - 1) * limitNumber;

    const products = await Product.find().skip(skip).limit(limitNumber).lean();
    const totalProducts = await Product.countDocuments();

    const totalPages = Math.ceil(totalProducts / limitNumber);
    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalProducts,
      },
    });
  } catch (error) {
    console.error("Error in fetching products: ", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
export const getProductById = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(404)
      .json({ success: false, message: "Invalid product id" });
  }
  try {
    const selectedProduct = await Product.findById(id).lean();
    if (!selectedProduct) {
      return res.status(401).json({
        success: false,
        message: "Product not found",
      });
    }
    res.status(200).json({ success: true, data: selectedProduct });
  } catch (error) {
    console.error("Error in updating products: ", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
export const addProduct = async (req, res) => {
  let { product, variations } = req.body;
  product = JSON.parse(product);
  variations = JSON.parse(variations);
  if (!product || !variations || !Array.isArray(variations)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product or variations data",
    });
  }

  const { name, description, price, category_id } = product;
  if (!name || !description || !price || !category_id) {
    return res.status(400).json({
      success: false,
      message: "Please provide all product fields",
    });
  }

  if (isNaN(price) || price <= 0) {
    return res.status(400).json({
      success: false,
      message: "Price must be a positive number",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(category_id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid category id" });
  }

  const seller_id = req.user.id;

  const newProduct = new Product({
    ...product,
    seller_id,
  });

  try {
    const savedProduct = await newProduct.save();

    const productVariations = variations.map((variation) => ({
      ...variation,
      product_id: savedProduct._id,
    }));

    const savedVariations = await ProductVariation.insertMany(
      productVariations
    );

    // Handle multiple images for the product (not per variation)
    const images = req.files || [];
    const imageDocs = [];

    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        folder: "products",
      });

      imageDocs.push({
        productId: savedProduct._id,
        imageUrl: uploadResult.secure_url,
        altText: file.originalname,
        displayOrder: i,
        isPrimary: i === 0,
      });
    }

    const savedImages = await ProductImage.insertMany(imageDocs);

    res.status(201).json({
      success: true,
      data: {
        product: savedProduct,
        variations: savedVariations,
        images: savedImages,
      },
    });
  } catch (error) {
    console.error("Error in adding products: ", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const product = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(404)
      .json({ success: false, message: "Invalid product id" });
  }
  try {
    const updatedProduct = await Product.findByIdAndUpdate(id, product, {
      new: true,
    });
    res.status(200).json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Error in updating products: ", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    await Product.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Product deleted" });
  } catch (error) {
    console.error("Error in delete product", error.message);
    res.status(404).json({ success: false, message: "Product not found" });
  }
};
