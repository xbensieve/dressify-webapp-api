import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    trim: true,
    required: true,
  },
  parent_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
  },
});

const Category = mongoose.model("Category", categorySchema);
export default Category;