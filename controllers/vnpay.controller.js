import crypto from "crypto";
import dotenv from "dotenv";
import moment from "moment";
import Order from "../models/order.model.js";
import Transaction from "../models/transaction.model.js";
import ProductVariation from "../models/productVariation.model.js";
import OrderDetail from "../models/orderDetail.model.js";
import mongoose from "mongoose";
dotenv.config();

export const generatePaymentUrl = async (req, res) => {
  process.env.TZ = "Asia/Ho_Chi_Minh";

  const { orderId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res
      .status(404)
      .json({ success: false, message: "Invalid order id" });
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(401).json({
      success: false,
      message: "OrderId not found",
    });
  }

  let date = new Date();
  let createDate = moment(date).format("YYYYMMDDHHmmss");
  let expireDate = moment(date).add(15, "minutes").format("YYYYMMDDHHmmss");
  let ipAddr = "1.55.200.158";
  const tmnCode = process.env.VNP_TMN_CODE;
  const secretKey = process.env.VNP_HASH_SECRET;
  const vnpUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
  const returnUrl = process.env.VNP_RETURN_URL;

  let locale = "vn";
  let currCode = "VND";

  let vnp_Params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Locale: locale,
    vnp_CurrCode: currCode,
    vnp_TxnRef: orderId,
    vnp_OrderInfo: `Payment for ${orderId}`,
    vnp_OrderType: "other",
    vnp_Amount: order.total_amount * 100 * 26000,
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
  };

  const sortedParams = sortParams(vnp_Params);

  const urlParams = new URLSearchParams();
  for (let [key, value] of Object.entries(sortedParams)) {
    urlParams.append(key, value);
  }

  const querystring = urlParams.toString();

  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(querystring).digest("hex");

  urlParams.append("vnp_SecureHash", signed);

  const paymentUrl = `${vnpUrl}?${urlParams.toString()}`;

  res.json({
    success: true,
    paymentUrl: paymentUrl,
  });
};

function sortParams(obj) {
  const sortedObj = Object.entries(obj)
    .filter(
      ([key, value]) => value !== "" && value !== undefined && value !== null
    )
    .sort(([key1], [key2]) => key1.toString().localeCompare(key2.toString()))
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});

  return sortedObj;
}

export const handlePaymentResponse = async (req, res) => {
  const {
    vnp_ResponseCode,
    vnp_TxnRef,
    vnp_TransactionNo,
    vnp_Amount,
    vnp_BankCode,
    vnp_PayDate,
    vnp_OrderInfo,
    vnp_CardType,
    vnp_TransactionStatus,
  } = req.query;
  try {
    if (!vnp_ResponseCode || !vnp_TxnRef) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const order = await Order.findById(vnp_TxnRef);
    if (!order) {
      return res.status(401).json({
        success: false,
        message: "OrderId not found",
      });
    }
    let redirectUrl = "";
    let status = "failed";
    if (vnp_ResponseCode !== "00") {
      await OrderDetail.deleteMany({ order_id: order._id });
      await Order.findByIdAndDelete(order._id);
      redirectUrl = "https://dressify-vesti.vercel.app/failed";
    } else {
      order.order_status = "completed";
      status = "completed";
      redirectUrl = "https://dressify-vesti.vercel.app/success";
      const orderDetails = await OrderDetail.find({ order_id: order._id });
      for (const detail of orderDetails) {
        await ProductVariation.findByIdAndUpdate(detail.variation_id, {
          $inc: { stock_quantity: -detail.quantity },
        });
      }
      await order.save();
    }

    await Transaction.create({
      order_id: order._id,
      payment_method: "vnpay",
      amount: Number(vnp_Amount) / 100,
      transaction_id: vnp_TransactionNo,
      status,
    });
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("VNPAY handlePaymentResponse error:", error);
    if (req.query && req.query.vnp_TxnRef) {
      try {
        await OrderDetail.deleteMany({ order_id: req.query.vnp_TxnRef });
        await Order.findByIdAndDelete(req.query.vnp_TxnRef);
      } catch (e) {
        console.error("Error deleting order in catch:", e);
      }
    }
    return res.redirect("https://dressify-vesti.vercel.app/failed");
  }
};
