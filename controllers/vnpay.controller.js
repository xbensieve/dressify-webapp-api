import crypto from "crypto";
import dotenv from "dotenv";
import moment from "moment";
import qs from "qs"; // This is used for query string generation

dotenv.config();

export const generatePaymentUrl = async (req, res) => {
  process.env.TZ = "Asia/Ho_Chi_Minh";

  const { orderId, amount, bankCode, language } = req.body;

  if (!orderId || !amount) {
    return res.status(400).json({
      success: false,
      message: "orderId and amount are required",
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

  let locale = language || "vn";
  let currCode = "VND";

  let vnp_Params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Locale: locale,
    vnp_CurrCode: currCode,
    vnp_TxnRef: orderId,
    vnp_OrderInfo: `Thanh toan don hang: ${orderId}`,
    vnp_OrderType: "other",
    vnp_Amount: parseInt(amount, 10) * 100,
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
  };

  if (bankCode) {
    vnp_Params["vnp_BankCode"] = bankCode;
  }

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
