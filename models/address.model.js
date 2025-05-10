import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    street: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    postal_code: {
      type: String,
      required: true,
    },
    is_default: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Address = mongoose.model("Address", addressSchema);
export default Address;
