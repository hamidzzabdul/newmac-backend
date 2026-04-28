const SHOP_LAT = Number(process.env.SHOP_LAT);
const SHOP_LNG = Number(process.env.SHOP_LNG);

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function calculateShippingFee(customerLat, customerLng, fulfillmentMethod) {
  if (fulfillmentMethod === "pickup") {
    return {
      shippingFee: 0,
      distanceKm: 0,
    };
  }

  if (!customerLat || !customerLng) {
    return {
      shippingFee: 150,
      distanceKm: null,
    };
  }

  const distanceKm = calculateDistanceKm(
    SHOP_LAT,
    SHOP_LNG,
    Number(customerLat),
    Number(customerLng),
  );

  let shippingFee = 150;

  if (distanceKm <= 3) shippingFee = 150;
  else if (distanceKm <= 7) shippingFee = 250;
  else if (distanceKm <= 12) shippingFee = 350;
  else if (distanceKm <= 20) shippingFee = 500;
  else shippingFee = 700;

  return {
    shippingFee,
    distanceKm: Math.round(distanceKm * 10) / 10,
  };
}

module.exports = { calculateShippingFee };
