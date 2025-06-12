import Address from "../models/address.model.js";

export const createAddress = async (req, res) => {
  const { street, city, state, country, postal_code } = req.body;
  if (!street || !city || !state || !country || !postal_code) {
    return res.status(400).json({
      success: false,
      message: "All fields required",
    });
  }

  const user_id = req.user.id;
  const addressCount = await Address.countDocuments({ user_id });
  const address = new Address({
    user_id,
    street,
    city,
    state,
    country,
    postal_code,
    is_default: addressCount === 0,
  });
  await address.save();

  res.status(200).json({
    success: true,
    message: "Address created successfully",
  });
};

export const setDefaultAddress = async (req, res) => {
  const { addressId } = req.params;
  const user_id = req.user.id;

  await Address.updateMany({ user_id }, { is_default: false });

  const updated = await Address.findOneAndUpdate(
    { _id: addressId, user_id },
    { is_default: true },
    { new: true }
  );

  if (!updated) {
    return res
      .status(404)
      .json({ success: false, message: "Address not found" });
  }

  res.json({ success: true, message: "Default address set", address: updated });
};

export const editAddress = async (req, res) => {
  const { addressId } = req.params;
  const user_id = req.user.id;
  const { street, city, state, country, postal_code } = req.body;

  const updated = await Address.findOneAndUpdate(
    { _id: addressId, user_id },
    { street, city, state, country, postal_code },
    { new: true }
  );

  if (!updated) {
    return res
      .status(404)
      .json({ success: false, message: "Address not found" });
  }

  res.json({ success: true, message: "Address updated", address: updated });
};
export const deleteAddress = async (req, res) => {
  const { addressId } = req.params;
  const user_id = req.user.id;

  const deleted = await Address.findOneAndDelete({ _id: addressId, user_id });

  if (!deleted) {
    return res
      .status(404)
      .json({ success: false, message: "Address not found" });
  }

  res.json({ success: true, message: "Address deleted" });
};
