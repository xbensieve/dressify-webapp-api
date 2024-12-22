import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    trim: true,
    required: true,
  },
});
