import Product from "../models/product.model.js";
import mongoose from "mongoose";
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

export const addProduct = async (req, res) => {
  const product = req.body;
  if (
    !product.name ||
    !product.unitPrice ||
    !product.image ||
    !product.sizes ||
    !product.colors ||
    !product.description ||
    !product.stock
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide all fields!" });
  }
  const newProduct = new Product(product);
  try {
    await newProduct.save();
    res
      .status(201)
      .json({ success: true, message: "Product created successfully" });
  } catch (error) {
    console.error("Error in create product: ", error.message);
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
