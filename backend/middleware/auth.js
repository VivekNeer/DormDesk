const { isDemoMode } = require("../config/runtime");

function parseGroups(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(",")
    .map((group) => group.trim())
    .filter(Boolean);
}

function demoUserFromHeaders(req) {
  const email = req.headers["x-demo-user-email"];

  if (!email) {
    return null;
  }

  return {
    sub:
      req.headers["x-demo-user-sub"] ||
      `demo-${String(email)
        .replace(/[^a-z0-9]/gi, "-")
        .toLowerCase()}`,
    email,
    name: req.headers["x-demo-user-name"] || email,
    groups: parseGroups(req.headers["x-demo-user-groups"]),
  };
}

/**
 * Verifies the Cognito ID token from Authorization header.
 * Injects req.user = { sub, email, name, groups } on success.
 */
module.exports = async function auth(req, res, next) {
  if (isDemoMode) {
    const demoUser = demoUserFromHeaders(req);

    if (!demoUser) {
      return res.status(401).json({ error: "No demo session provided" });
    }

    req.user = demoUser;
    return next();
  }

  const verifier = require("../config/cognito");
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = await verifier.verify(token);
    req.user = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      groups: payload["cognito:groups"] || [],
    };
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
