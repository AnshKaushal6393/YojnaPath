require("../config/env");

const crypto = require("crypto");

const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const GOOGLE_ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

let certCache = {
  expiresAt: 0,
  keysByKid: new Map(),
};

function decodeBase64Url(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64");
}

function parseJwt(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid Google credential");
  }

  const [headerPart, payloadPart, signaturePart] = parts;
  const header = JSON.parse(decodeBase64Url(headerPart).toString("utf8"));
  const payload = JSON.parse(decodeBase64Url(payloadPart).toString("utf8"));
  const signature = decodeBase64Url(signaturePart);

  return {
    signingInput: `${headerPart}.${payloadPart}`,
    header,
    payload,
    signature,
  };
}

function toPemFromX5c(certificate) {
  const wrapped = String(certificate || "").match(/.{1,64}/g)?.join("\n");
  if (!wrapped) {
    throw new Error("Invalid Google certificate");
  }

  return `-----BEGIN CERTIFICATE-----\n${wrapped}\n-----END CERTIFICATE-----`;
}

function getCacheMaxAgeSeconds(cacheControl) {
  const match = String(cacheControl || "").match(/max-age=(\d+)/i);
  return match ? Number(match[1]) : 3600;
}

async function getGooglePublicKeys() {
  if (certCache.expiresAt > Date.now() && certCache.keysByKid.size > 0) {
    return certCache.keysByKid;
  }

  const response = await fetch(GOOGLE_CERTS_URL, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Could not fetch Google certificates");
  }

  const payload = await response.json();
  const keys = Array.isArray(payload?.keys) ? payload.keys : [];
  const keysByKid = new Map();

  for (const key of keys) {
    if (!key?.kid || !Array.isArray(key.x5c) || key.x5c.length === 0) {
      continue;
    }

    const pem = toPemFromX5c(key.x5c[0]);
    keysByKid.set(key.kid, crypto.createPublicKey(pem));
  }

  certCache = {
    expiresAt: Date.now() + getCacheMaxAgeSeconds(response.headers.get("cache-control")) * 1000,
    keysByKid,
  };

  return keysByKid;
}

async function verifyGoogleIdToken(idToken, expectedAudience) {
  if (!expectedAudience) {
    throw new Error("Missing Google client ID");
  }

  const token = parseJwt(idToken);

  if (token.header?.alg !== "RS256" || !token.header?.kid) {
    throw new Error("Invalid Google credential");
  }

  const keysByKid = await getGooglePublicKeys();
  const publicKey = keysByKid.get(token.header.kid);

  if (!publicKey) {
    certCache.expiresAt = 0;
    const refreshedKeys = await getGooglePublicKeys();
    const nextPublicKey = refreshedKeys.get(token.header.kid);
    if (!nextPublicKey) {
      return verifyGoogleIdTokenViaTokenInfo(idToken, expectedAudience);
    }

    return verifyParsedToken(token, nextPublicKey, expectedAudience);
  }

  return verifyParsedToken(token, publicKey, expectedAudience);
}

async function verifyGoogleIdTokenViaTokenInfo(idToken, expectedAudience) {
  const url = new URL(GOOGLE_TOKENINFO_URL);
  url.searchParams.set("id_token", idToken);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Google token verification failed");
  }

  const payload = await response.json();
  return normalizeVerifiedPayload(payload, expectedAudience);
}

function verifyParsedToken(token, publicKey, expectedAudience) {
  const isValidSignature = crypto.verify(
    "RSA-SHA256",
    Buffer.from(token.signingInput, "utf8"),
    publicKey,
    token.signature
  );

  if (!isValidSignature) {
    throw new Error("Invalid Google credential");
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const payload = token.payload || {};

  if (!GOOGLE_ISSUERS.has(payload.iss)) {
    throw new Error("Invalid Google issuer");
  }

  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(expectedAudience)) {
    throw new Error("Invalid Google audience");
  }

  if (!payload.exp || Number(payload.exp) <= nowInSeconds) {
    throw new Error("Google credential expired");
  }

  if (payload.nbf && Number(payload.nbf) > nowInSeconds) {
    throw new Error("Google credential not active yet");
  }

  if (!payload.sub) {
    throw new Error("Google subject is missing");
  }

  return normalizeVerifiedPayload(payload, expectedAudience);
}

function normalizeVerifiedPayload(payload, expectedAudience) {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(payload?.aud) ? payload.aud : [payload?.aud];

  if (!GOOGLE_ISSUERS.has(payload?.iss)) {
    throw new Error("Invalid Google issuer");
  }

  if (!audiences.includes(expectedAudience)) {
    throw new Error("Invalid Google audience");
  }

  if (!payload?.exp || Number(payload.exp) <= nowInSeconds) {
    throw new Error("Google credential expired");
  }

  return {
    sub: String(payload.sub),
    email: payload.email ? String(payload.email).toLowerCase() : "",
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    name: payload.name ? String(payload.name).trim() : "",
    picture: payload.picture ? String(payload.picture).trim() : "",
    givenName: payload.given_name ? String(payload.given_name).trim() : "",
    familyName: payload.family_name ? String(payload.family_name).trim() : "",
  };
}

module.exports = {
  verifyGoogleIdToken,
};
