require("../config/env");

function parseKioskCodes() {
  const raw = String(process.env.KIOSK_CODES || "").trim();
  if (!raw) {
    return new Map();
  }

  return raw.split(",").reduce((map, entry) => {
    const [code, kioskId] = entry.split(":").map((part) => String(part || "").trim());
    if (code && kioskId) {
      map.set(code.toUpperCase(), kioskId);
    }
    return map;
  }, new Map());
}

function resolveKioskId(kioskCode) {
  const codes = parseKioskCodes();
  return codes.get(String(kioskCode || "").trim().toUpperCase()) ?? null;
}

module.exports = {
  resolveKioskId,
};
