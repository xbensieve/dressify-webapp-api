import Transaction from "../models/transaction.model.js";
import OrderDetail from "../models/orderDetail.model.js";

export const getTransactionDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findById(id).populate("order_id");
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const orderDetails = await OrderDetail.find({
      order_id: transaction.order_id._id,
    })
      .populate("product_id")
      .populate("variation_id");

    const items = orderDetails.map((detail) => ({
      product: detail.product_id,
      variation: detail.variation_id,
      quantity: detail.quantity,
      price_at_purchase: detail.price_at_purchase,
    }));

    res.json({
      success: true,
      transaction,
      order: transaction.order_id,
      items,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};
