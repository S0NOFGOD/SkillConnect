// ==========================================
// IMPORT DEPENDENCIES
// ==========================================

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;


// ==========================================
// GOOGLE OAUTH STRATEGY
// ==========================================

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,

            clientSecret: process.env.GOOGLE_CLIENT_SECRET,

            callbackURL: process.env.GOOGLE_CALLBACK_URL
        },

        async (accessToken, refreshToken, profile, done) => {

            try {

                // ==========================================
                // EXTRACT GOOGLE ACCOUNT INFORMATION
                // ==========================================

                const googleId = profile.id;

                const email =
                    profile.emails &&
                    profile.emails[0]
                        ? profile.emails[0].value.toLowerCase()
                        : null;


                // ==========================================
                // VALIDATE GOOGLE EMAIL
                // ==========================================

                if (!email) {

                    return done(
                        null,
                        false,
                        {
                            message:
                                "Unable to retrieve your Google email address."
                        }
                    );

                }


                // ==========================================
                // RETURN GOOGLE USER DATA
                // ==========================================

                return done(
                    null,
                    {
                        googleId,
                        email,
                        firstName:
                            profile.name?.givenName || "",

                        lastName:
                            profile.name?.familyName || "",

                        profilePicture:
                            profile.photos &&
                            profile.photos[0]
                                ? profile.photos[0].value
                                : null
                    }
                );

            } catch (error) {

                console.error(
                    "Google authentication error:",
                    error
                );

                return done(error, null);
            }
        }
    )
);


// ==========================================
// SERIALIZE USER
// ==========================================

passport.serializeUser((user, done) => {

    done(null, user.googleId);

});


// ==========================================
// DESERIALIZE USER
// ==========================================

passport.deserializeUser(async (googleId, done) => {

    // Google authentication in SkillConnect uses
    // an exchange-code flow, so the application does
    // not rely on a persistent Passport session here.

    return done(null, { googleId });

});


// ==========================================
// EXPORT PASSPORT
// ==========================================

module.exports = passport;