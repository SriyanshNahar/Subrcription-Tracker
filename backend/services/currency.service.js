const axios = require('axios');

const fallbackRates = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0094,
  AUD: 0.018,
  CAD: 0.016,
  SGD: 0.016,
  AED: 0.044,
  JPY: 1.88,
  CHF: 0.011,
  SEK: 0.13,
  NOK: 0.13,
  DKK: 0.083,
  NZD: 0.020,
  BRL: 0.062
};

let cachedRates = null;
let lastFetched = null;

const getLatestRates = async () => {
  const cacheDuration = 4 * 60 * 60 * 1000; // Cache for 4 hours
  if (cachedRates && lastFetched && (Date.now() - lastFetched < cacheDuration)) {
    return cachedRates;
  }

  try {
    const response = await axios.get('https://open.er-api.com/v6/latest/INR', { timeout: 5000 });
    if (response.data && response.data.rates) {
      cachedRates = response.data.rates;
      lastFetched = Date.now();
      console.log('🔄 Live exchange rates successfully fetched and cached from ER-API');
      return cachedRates;
    }
  } catch (err) {
    console.warn('⚠️ Live currency rate fetch failed, falling back to static rates. Error:', err.message);
  }

  return fallbackRates;
};

const convertAmount = async (amount, fromCurrency, toCurrency) => {
  const rates = await getLatestRates();
  
  const from = fromCurrency ? fromCurrency.toUpperCase().trim() : 'INR';
  const to = toCurrency ? toCurrency.toUpperCase().trim() : 'INR';
  
  if (from === to) return amount;

  const rateFrom = rates[from] || fallbackRates[from] || 1;
  const rateTo = rates[to] || fallbackRates[to] || 1;

  const amountInINR = amount / rateFrom;
  return amountInINR * rateTo;
};

module.exports = {
  getLatestRates,
  convertAmount,
  fallbackRates
};
