/* =========================================================
   1. IMPORT CLIENT MODEL
========================================================= */

/*
   This model represents clients stored in MongoDB.

   The controller uses it to:

   - Find the client
   - Verify reset authorization
   - Update the password
   - Clear password-reset information
   - Save the client
*/

const Client =
    require("../models/client");


/* =========================================================
   2. IMPORT BCRYPT
========================================================= */

/*
   bcrypt is used to securely hash the client's
   new password before it is stored in MongoDB.

   IMPORTANT:

   We NEVER store the client's plain-text password.
*/

const bcrypt =
    require("bcryptjs");


/* =========================================================
   3. CHANGE CLIENT PASSWORD
========================================================= */

/*
   This function handles:

       POST /api/client-password-change

   Expected request body:

   {
       email: "client@example.com",

       resetAuthorization:
           "temporary-reset-authorization",

       password:
           "NewPassword123"
   }
*/

const changeClientPassword =
    async (
        req,
        res
    ) => {

        try {

            /* =========================================
               4. GET DATA FROM REQUEST BODY
            ========================================= */

            /*
               Extract the three values sent by the
               client-password-change frontend.

               We use trim() on the email because
               accidental spaces should not prevent
               the client from being found.
            */

            const {
                email,
                resetAuthorization,
                password
            } =
                req.body;


            /* =========================================
               5. VALIDATE REQUIRED DATA
            ========================================= */

            /*
               The backend must NEVER rely only on
               frontend validation.

               A malicious user can send requests
               directly to the API.

               Therefore, the backend validates all
               required values again.
            */

            if (
                !email ||
                !resetAuthorization ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email, reset authorization, and new password are required."

                });

            }


            /* =========================================
               6. NORMALIZE EMAIL
            ========================================= */

            /*
               Email addresses should be handled
               consistently.

               Example:

                   USER@EMAIL.COM

               becomes:

                   user@email.com
            */

            const normalizedEmail =
                email
                    .trim()
                    .toLowerCase();


            /* =========================================
               7. BACKEND PASSWORD VALIDATION
            ========================================= */

            if (password.length < 8 ) {
                
                return res.status(400).json({
                    
                    success: false,
                    message: "Password must be at least 8 characters."
                });
            }

            /* =========================================
               8. FIND CLIENT
            ========================================= */

            /*
               Search MongoDB using the normalized
               client email.
            */

            const client =
                await Client.findOne({

                    email:
                        normalizedEmail

                });


            /* =========================================
               9. CLIENT DOES NOT EXIST
            ========================================= */

            if (!client) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Client account was not found."

                });

            }


            /* =========================================
               10. CHECK RESET AUTHORIZATION
            ========================================= */


            if (
                !client.resetAuthorization
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Your password reset authorization is invalid or has already been used."

                });

            }


            /* =========================================
               11. COMPARE RESET AUTHORIZATION
            ========================================= */

            if (
                client.resetAuthorization !==
                resetAuthorization
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Your password reset authorization is invalid."

                });

            }


            /* =========================================
               12. CHECK RESET AUTHORIZATION EXPIRY
            ========================================= */
            if (
                !client.resetAuthorizationExpires
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Your password reset authorization has expired. Please start the password reset process again."

                });

            }


            /* =========================================
               13. CONVERT EXPIRATION TO DATE
            ========================================= */

            const authorizationExpires =
                new Date(
                    client.resetAuthorizationExpires
                );


            /* =========================================
               14. CHECK INVALID EXPIRATION DATE
            ========================================= */

            if (
                Number.isNaN(
                    authorizationExpires.getTime()
                )
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Your password reset authorization is invalid or expired."

                });

            }


            /* =========================================
               15. CHECK WHETHER AUTHORIZATION EXPIRED
            ========================================= */

            if (
                authorizationExpires.getTime() <=
                Date.now()
            ) {

                client.resetAuthorization =
                    undefined;

                client.resetAuthorizationExpires =
                    undefined;


                client.passwordResetOtp =
                    undefined;

                client.passwordResetOtpExpires =
                    undefined;


                await client.save();


                return res.status(401).json({

                    success: false,

                    message:
                        "Your password reset authorization has expired. Please start the password reset process again."

                });

            }


            /* =========================================
               16. HASH NEW PASSWORD
            ========================================= */

            /*
               Generate a secure bcrypt hash.

               Salt rounds:

                   12

               A higher number increases password
               hashing cost and makes brute-force
               attacks more expensive.

               The plain password is never saved.
            */

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    12
                );


            /* =========================================
               17. UPDATE CLIENT PASSWORD
            ========================================= */

            client.password =
                hashedPassword;


            /* =========================================
               18. CLEAR RESET AUTHORIZATION
            ========================================= */

            /*
               This is extremely important.

               Once the password has successfully
               changed, the authorization must not
               be reusable.
            */

            client.resetAuthorization =
                undefined;


            /* =========================================
               19. CLEAR RESET AUTHORIZATION EXPIRY
            ========================================= */

            client.resetAuthorizationExpires =
                undefined;


            /* =========================================
               20. CLEAR PASSWORD RESET OTP
            ========================================= */

            /*
               The OTP has already served its purpose.

               Remove it so it cannot be reused.
            */

            client.passwordResetOtp =
                undefined;


            /* =========================================
               21. CLEAR PASSWORD RESET OTP EXPIRATION
            ========================================= */

            client.passwordResetOtpExpires =
                undefined;


            /* =========================================
               22. SAVE CLIENT
            ========================================= */

            /*
               Save all changes to MongoDB.

               This saves:

               - New password
               - Cleared reset authorization
               - Cleared authorization expiry
               - Cleared password reset OTP
               - Cleared OTP expiration
            */

            await client.save();


            /* =========================================
               23. SEND SUCCESS RESPONSE
            ========================================= */

            /*
               The frontend receives this response
               and displays it inside the success modal.

               The frontend then:

               1. Clears sessionStorage.clientEmail
               2. Clears sessionStorage.resetAuthorization
               3. Shows success modal
               4. Waits 1.5 seconds
               5. Redirects to client authentication
            */

            return res.status(200).json({

                success: true,

                message:
                    "Your password has been changed successfully. You can now log in with your new password."

            });

        }

        catch (error) {

            /* =========================================
               24. SERVER ERROR
            ========================================= */

            /*
               Log the actual error on the server.

               Do not expose sensitive database or
               implementation details to the client.
            */

            console.error(
                "Client password change error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "An error occurred while changing your password. Please try again."

            });

        }

    };


/* =========================================================
   25. EXPORT CONTROLLER
========================================================= */

/*
   Export the controller so the route file can use:

       changeClientPassword
*/

module.exports = {

    changeClientPassword

};


/* =========================================================
   END OF CLIENT PASSWORD CHANGE CONTROLLER
========================================================= */