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

  const address = new Address({
    user_id,
    street,
    city,
    state,
    country,
    postal_code,
  });
  await address.save();

  res.status(200).json({
    success: true,
    message: "Address created successfully",
  });
};
