const axios = require("axios");

class PesaPalServices {
  constructor() {
    this.baseURL = process.env.PESAPAL_BASE_URL;
    this.consumerKey = process.env.PESAPAL_CONSUMER_KEY;
    this.consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;
    this.token = null;
    this.tokenExpiry = null;
  }

  async getToken() {
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/api/Auth/RequestToken`,
        {
          consumer_key: this.consumerKey,
          consumer_secret: this.consumerSecret,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      this.token = response.data.token;
      this.tokenExpiry = new Date(response.data.expiryDate);

      return this.token;
    } catch (error) {
      console.error(
        "Pesapal auth error:",
        error.response?.data || error.message
      );
      throw new Error("Failed to authenticate with Pesapal");
    }
  }
  async registerIPN(ipnUrl) {
    try {
      const token = await this.getToken();

      const response = await axios.post(
        `${this.baseURL}/api/URLSetup/RegisterIPN`,
        {
          url: ipnUrl,
          ipn_notification_type: "GET",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "IPN registration error:",
        error.response?.data || error.message
      );
      throw new Error("Failed to register IPN");
    }
  }
  async submitOrderRequest(orderData) {
    try {
      const token = await this.getToken();

      const payload = {
        id: orderData.merchantReference,
        currency: "KES",
        amount: orderData.amount,
        description: orderData.description,
        callback_url: orderData.callbackUrl,
        notification_id: orderData.ipnId,
        billing_address: {
          email_address: orderData.email,
          phone_number: orderData.phone,
          country_code: "KE",
          first_name: orderData.firstName,
          last_name: orderData.lastName,
          line_1: orderData.address?.street || "",
          city: orderData.address?.city || "",
        },
      };

      const response = await axios.post(
        `${this.baseURL}/api/Transactions/SubmitOrderRequest`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Order submission error:",
        error.response?.data || error.message
      );
      throw new Error("Failed to submit order to Pesapal");
    }
  }

  async getTransactionStatus(orderTrackingId) {
    try {
      const token = await this.getToken();

      const response = await axios.get(
        `${this.baseURL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Status check error:",
        error.response?.data || error.message
      );
      throw new Error("Failed to get transaction status");
    }
  }
}

module.exports = new PesaPalServices();
