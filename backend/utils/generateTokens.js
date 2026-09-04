/* =========================================================
   1. IMPORT DEPENDENCIES
========================================================= */

const jwt =
    require("jsonwebtoken");

const crypto =
    require("crypto");

const Worker =
    require("../models/worker");



/* =========================================================
   2. GENERATE ACCESS TOKEN
========================================================= */

const generateAccessToken = ({
    userId,
    userType
}) => {

    return jwt.sign(

        {
            userId,
            userType
        },

        process.env.ACCESS_TOKEN_SECRET,

        {
            expiresIn:
                process.env.ACCESS_TOKEN_EXPIRE || "15m"
        }

    );

};



/* =========================================================
   3. GENERATE REFRESH TOKEN
========================================================= */

const generateRefreshToken = ({
    userId,
    userType
}) => {

    return jwt.sign(

        {
            userId,
            userType
        },

        process.env.REFRESH_TOKEN_SECRET,

        {
            expiresIn:
                process.env.REFRESH_TOKEN_EXPIRE || "7d"
        }

    );

};



/* =========================================================
   4. HASH REFRESH TOKEN
========================================================= */

/*
   The raw refresh token is sent to the browser
   as an HTTP-only cookie.

   Only its SHA-256 hash is stored in MongoDB.

   This means a stolen database record cannot
   directly be used as the refresh token.
*/

const hashRefreshToken = (
    refreshToken
) => {

    return crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

};



/* =========================================================
   5. GENERATE TOKENS AND SAVE REFRESH TOKEN HASH
========================================================= */

const generateTokens = async ({
    userId,
    userType
}) => {

    /* -----------------------------------------------------
       Generate access token
    ----------------------------------------------------- */

    const accessToken =
        generateAccessToken({
            userId,
            userType
        });


    /* -----------------------------------------------------
       Generate refresh token
    ----------------------------------------------------- */

    const refreshToken =
        generateRefreshToken({
            userId,
            userType
        });


    /* -----------------------------------------------------
       Hash refresh token
    ----------------------------------------------------- */

    const refreshTokenHash =
        hashRefreshToken(
            refreshToken
        );


    /* -----------------------------------------------------
       Save refresh token hash
    ----------------------------------------------------- */

    if (userType === "worker") {

        await Worker.findByIdAndUpdate(

            userId,

            {
                refreshTokenHash
            },

            {
                new: false
            }

        );

    }


    /* -----------------------------------------------------
       Return generated tokens
    ----------------------------------------------------- */

    return {

        accessToken,

        refreshToken,

        refreshTokenHash

    };

};



/* =========================================================
   6. EXPORT FUNCTIONS
========================================================= */

module.exports = {

    generateAccessToken,

    generateRefreshToken,

    hashRefreshToken,

    generateTokens

};