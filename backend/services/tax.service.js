const TAX_RATES = {
  IN: { name: "GST", rate: 0.18, label: "18% GST" },
  US: { name: "Sales Tax", rate: 0.00, label: "0.00% Sales Tax (SaaS Exempt)", note: "Consult tax advisor for state-specific rates" },
  GB: { name: "VAT", rate: 0.20, label: "20% VAT" },
  DE: { name: "VAT", rate: 0.19, label: "19% MwSt" },
  FR: { name: "VAT", rate: 0.20, label: "20% TVA" },
  AU: { name: "GST", rate: 0.10, label: "10% GST" },
  CA: { name: "HST", rate: 0.13, label: "13% HST" },
  SG: { name: "GST", rate: 0.09, label: "9% GST" },
  AE: { name: "VAT", rate: 0.05, label: "5% VAT" },
  JP: { name: "Consumption Tax", rate: 0.10, label: "10% Consumption Tax" },
  CH: { name: "VAT", rate: 0.081, label: "8.1% VAT" },
  SE: { name: "VAT", rate: 0.25, label: "25% VAT" },
  NO: { name: "VAT", rate: 0.25, label: "25% VAT" },
  DK: { name: "VAT", rate: 0.25, label: "25% VAT" },
  NZ: { name: "GST", rate: 0.15, label: "15% GST" },
  BR: { name: "ISS", rate: 0.05, label: "5% ISS (approx. average)", note: "Brazilian tax rates vary. Consult tax advisor." },
  DEFAULT: { name: "Tax", rate: 0.00, label: "No Tax" }
};

const getTaxByCountry = (countryCode) => {
  if (!countryCode) return TAX_RATES.DEFAULT;
  const upperCode = countryCode.toUpperCase().trim();
  return TAX_RATES[upperCode] || TAX_RATES.DEFAULT;
};

module.exports = {
  TAX_RATES,
  getTaxByCountry
};
