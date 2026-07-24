const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // Fail loudly rather than silently signing tokens with a weak default in production.
  console.warn("⚠️  JWT_SECRET غير موجود في .env — استخدم قيمة عشوائية طويلة قبل النشر الحقيقي.");
}
const SECRET = JWT_SECRET || "dev-only-insecure-secret-change-me";

function signToken(payload, expiresIn = "12h") {
  return jwt.sign(payload, SECRET, { expiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

/** Express middleware: requires a valid Bearer token with one of the given role(s), attaches req.auth */
function requireRole(roleOrRoles) {
  const allowed = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "لازم تسجل دخول" });
    try {
      const decoded = verifyToken(token);
      if (allowed.length && !allowed.includes(decoded.role)) {
        return res.status(403).json({ error: "غير مسموح لك بهذا الإجراء" });
      }
      req.auth = decoded;
      next();
    } catch {
      return res.status(401).json({ error: "الجلسة انتهت، سجل دخول تاني" });
    }
  };
}

module.exports = {
  hash: (plain) => bcrypt.hashSync(plain, 10),
  compare: (plain, hash) => bcrypt.compareSync(plain, hash),
  signToken,
  verifyToken,
  requireRole,
};
