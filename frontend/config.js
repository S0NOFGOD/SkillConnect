/* =========================================================
   1. BACKEND URLS
========================================================= */

const DEVELOPMENT_API_URL =
    "http://localhost:5000";

const PRODUCTION_API_URL = "https://skillconnect-qjhr.onrender.com";



/* =========================================================
   2. DETERMINE CURRENT ENVIRONMENT
========================================================= */

const isDevelopment =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";



/* =========================================================
   3. SELECT API URL
========================================================= */

const API_URL =
    isDevelopment
        ? DEVELOPMENT_API_URL
        : PRODUCTION_API_URL;



/* =========================================================
   4. CREATE API ENDPOINT HELPER
========================================================= */

function API_ENDPOINT(
    path
) {

    /*
       Remove an unnecessary slash from the
       beginning of the path if necessary.
    */

    const cleanPath =
        path.startsWith("/")
            ? path
            : `/${path}`;


    /*
       Return the complete API URL.
    */

    return (
        `${API_URL}${cleanPath}`
    );

}



/* =========================================================
   5. EXPORT GLOBAL CONFIGURATION
========================================================= */

/*
   Because this is a normal browser JavaScript file,
   API_URL and API_ENDPOINT are available to the
   scripts loaded after this file.
*/


console.log(
    `SkillConnect API environment: ${
        isDevelopment
            ? "DEVELOPMENT"
            : "PRODUCTION"
    }`
);


console.log(
    `SkillConnect API URL: ${API_URL}`
);