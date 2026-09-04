/* =========================================================
   1. IMPORT DEPENDENCIES
========================================================= */

const crypto = require("crypto");
const Worker = require("../models/worker");


/* =========================================================
   2. EXCHANGE CODE CONFIGURATION
========================================================= */

const GOOGLE_EXCHANGE_CODE_EXPIRY = 60 * 1000; // 60 seconds


/* =========================================================
   3. HASH EXCHANGE CODE
========================================================= */

const hashExchangeCode = (code) => {
  return crypto
    .createHash("sha256")
    .update(code)
    .digest("hex");
};


/* =========================================================
   4. GENERATE GOOGLE EXCHANGE CODE
========================================================= */

const generateGoogleExchangeCode = async (workerId) => {

  // Generate a cryptographically secure random code
  const rawCode = crypto.randomBytes(32).toString("hex");

  // Store only the hash in MongoDB
  const hashedCode = hashExchangeCode(rawCode);

  // Calculate expiration time
  const expiresAt = new Date(
    Date.now() + GOOGLE_EXCHANGE_CODE_EXPIRY
  );

  // Save hashed code and expiry
  await Worker.findByIdAndUpdate(workerId, {
    googleExchangeCode: hashedCode,
    googleExchangeCodeExpires: expiresAt
  });

  // Return the RAW code.
  // This is the code that is temporarily sent to the frontend URL.
  return rawCode;
};


/* =========================================================
   5. CONSUME GOOGLE EXCHANGE CODE
========================================================= */

const consumeGoogleExchangeCode = async (rawCode) => {

  // Validate code
  if (!rawCode) {
    return null;
  }

  // Hash the code received from the frontend
  const hashedCode = hashExchangeCode(rawCode);

  // Find worker using the HASH
  const worker = await Worker.findOne({
    googleExchangeCode: hashedCode
  })
    .select(
      "+googleExchangeCode +googleExchangeCodeExpires +googleId"
    );

  // Code does not exist
  if (!worker) {
    return null;
  }

  // Code has expired
  if (
    !worker.googleExchangeCodeExpires ||
    worker.googleExchangeCodeExpires.getTime() < Date.now()
  ) {
    // Clear expired code
    worker.googleExchangeCode = undefined;
    worker.googleExchangeCodeExpires = undefined;

    await worker.save();

    return null;
  }

  /* =======================================================
     6. CONSUME CODE IMMEDIATELY
  ======================================================= */

  // Clear the code before returning.
  // This makes the exchange code one-time use.
  worker.googleExchangeCode = undefined;
  worker.googleExchangeCodeExpires = undefined;

  await worker.save();


  /* =======================================================
     7. RETURN WORKER INFORMATION
  ======================================================= */

  return {
    workerId: worker._id,
    email: worker.email
  };
};


/* =========================================================
   8. EXPORT FUNCTIONS
========================================================= */

module.exports = {
  generateGoogleExchangeCode,
  consumeGoogleExchangeCode,
  hashExchangeCode
};