import Product from "../models/product.model.js";
import ProductVariation from "../models/productVariation.model.js";
import mongoose from "mongoose";
import cloudinary from "../utils/cloudinary.js";
import ProductImage from "../models/productImage.model.js";
import Category from "../models/category.model.js";

export const searchProducts = async (req, res) => {
  //check if there no data in the query
  if (Object.keys(req.query).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please provide search parameters",
    });
  }
  //check if the query is not empty
  if (req.query.keyword === "") {
    return res.status(400).json({
      success: false,
      message: "Please provide a keyword to search",
    });
  }
  // Add default values for the query if not provided
  req.query.keyword = req.query.keyword ?? "";
  req.query.sortBy = req.query.sortBy ?? "latest";
  req.query.page = req.query.page ?? 1;
  req.query.limit = req.query.limit ?? 10;

  try {
    const {
      keyword = "",
      sortBy = "latest",
      page = 1,
      limit = 10,
      minPrice,
      maxPrice,
    } = req.query;

    const categoryMatch = keyword
      ? await Category.find({
          name: { $regex: keyword, $options: "i" },
        }).select("_id")
      : [];
    const categoryIds = categoryMatch.map((category) => category._id);
    const query = {
      $or: [
        { name: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        ...(categoryIds.length > 0
          ? [{ category_id: { $in: categoryIds } }]
          : []),
      ],
    };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    let sort = {};
    if (sortBy === "price_asc") sort.price = 1;
    else if (sortBy === "price_des") sort.price = -1;
    else sort.createdAt = -1;

    const skip = (Number(page) - 1) * Number(limit);

    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();
    const productIds = products.map((p) => p._id);
    const variations = await ProductVariation.find({
      product_id: { $in: productIds },
    }).lean();
    const images = await ProductImage.find({
      productId: { $in: productIds },
    }).lean();

    const productMap = products.map((product) => ({
      ...product,
      variations: variations.filter(
        (v) => v.product_id.toString() === product._id.toString()
      ),
      images: images.filter(
        (img) => img.productId.toString() === product._id.toString()
      ),
    }));
    res.status(200).json({
      success: true,
      data: productMap,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalProducts: total,
      },
    });
  } catch (error) {
    console.error("Error in searching products: ", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getProductById = async (req, res) => {
  const { id } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(404)
      .json({ success: false, message: "Invalid product id" });
  }
  try {
    const product = await Product.findById(id).lean();
    // Check if product exists
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    const variations = await ProductVariation.find({
      product_id: product._id,
    }).lean();
    const images = await ProductImage.find({
      productId: product._id,
    }).lean();
    const category = await Category.findById(product.category_id).lean();
    const productWithDetails = {
      ...product,
      variations,
      images,
      category,
    };
    res.status(200).json({
      success: true,
      data: productWithDetails,
    });
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
      message: "Product added successfully",
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
