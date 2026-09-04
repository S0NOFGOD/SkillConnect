/* =========================================================
   SKILLCONNECT FRONTEND API + AUTH CONFIGURATION
========================================================= */


/* =========================================================
   1. BACKEND URLS
========================================================= */

const DEVELOPMENT_API_URL =
    "http://localhost:5000";

const PRODUCTION_API_URL =
    "https://skillconnect-qjhr.onrender.com";


/* =========================================================
   2. API ENDPOINTS
========================================================= */

const REFRESH_TOKEN_ENDPOINT =
    "/api/auth/worker/refresh";


/* =========================================================
   3. DETERMINE CURRENT ENVIRONMENT
========================================================= */

const isDevelopment =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";


/* =========================================================
   4. SELECT API URL
========================================================= */

const API_URL =
    isDevelopment
        ? DEVELOPMENT_API_URL
        : PRODUCTION_API_URL;


/* =========================================================
   5. CREATE API ENDPOINT HELPER
========================================================= */

function API_ENDPOINT(path) {

    const cleanPath =
        path.startsWith("/")
            ? path
            : `/${path}`;

    return `${API_URL}${cleanPath}`;
}


/* =========================================================
   6. ACCESS TOKEN STORAGE
========================================================= */

function getAccessToken() {

    return sessionStorage.getItem(
        "accessToken"
    );
}


function setAccessToken(accessToken) {

    if (!accessToken) {
        return;
    }

    sessionStorage.setItem(
        "accessToken",
        accessToken
    );
}


function removeAccessToken() {

    sessionStorage.removeItem(
        "accessToken"
    );
}


/* =========================================================
   7. REFRESH TOKEN STATE
========================================================= */

let refreshTokenPromise = null;


/* =========================================================
   8. REFRESH ACCESS TOKEN
========================================================= */

async function refreshAccessToken() {

    if (refreshTokenPromise) {
        return refreshTokenPromise;
    }


    refreshTokenPromise =
        (async () => {

            try {

                const response =
                    await fetch(
                        API_ENDPOINT(
                            REFRESH_TOKEN_ENDPOINT
                        ),
                        {
                            method: "POST",

                            credentials: "include",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            }
                        }
                    );


                /* ========================================
                   REFRESH FAILED
                ======================================== */

                if (!response.ok) {

                    removeAccessToken();

                    window.dispatchEvent(
                        new CustomEvent(
                            "authSessionExpired"
                        )
                    );


                    return null;
                }


                /* ========================================
                   READ RESPONSE
                ======================================== */

                const data =
                    await response.json();

                const newAccessToken =
                    data.accessToken;


                /* ========================================
                   VALIDATE NEW TOKEN
                ======================================== */

                if (!newAccessToken) {

                    removeAccessToken();

                    window.dispatchEvent(
                        new CustomEvent(
                            "authSessionExpired"
                        )
                    );

                    return null;
                }


                /* ========================================
                   SAVE NEW ACCESS TOKEN
                ======================================== */

                setAccessToken(
                    newAccessToken
                );


                /* ========================================
                   NOTIFY PROTECTED PAGES
                ======================================== */

                window.dispatchEvent(
                    new CustomEvent(
                        "accessTokenRefreshed",
                        {
                            detail: {
                                accessToken:
                                    newAccessToken
                            }
                        }
                    )
                );


                return newAccessToken;

            }

            catch (error) {

                console.error(
                    "Refresh token request failed:",
                    error
                );


                removeAccessToken();


                window.dispatchEvent(
                    new CustomEvent(
                        "authSessionExpired"
                    )
                );


                return null;

            }

            finally {

                refreshTokenPromise = null;
            }

        })();


    return refreshTokenPromise;
}


/* =========================================================
   9. AUTHENTICATED API REQUEST
========================================================= */


async function API_REQUEST(
    path,
    options = {}
) {

    const accessToken =
        getAccessToken();


    const headers = {
        ...(options.headers || {})
    };


    if (accessToken) {

        headers.Authorization =
            `Bearer ${accessToken}`;
    }

    let response =
        await fetch(
            API_ENDPOINT(path),
            {
                ...options,

                headers,


                credentials:
                    options.credentials ||
                    "include"
            }
        );


    /* =====================================================
       10. ACCESS TOKEN EXPIRED
    ===================================================== */

    if (response.status !== 401) {

        return response;
    }

    const newAccessToken =
    await refreshAccessToken();


    /* =====================================================
     11. REFRESH FAILED
    ===================================================== */

    if (!newAccessToken) {

      // Do not retry the request
      return response;
    }


    /* =====================================================
      12. RETRY ORIGINAL REQUEST
    ===================================================== */

    const retryHeaders = {
        ...(options.headers || {})
    };


    retryHeaders.Authorization = `Bearer ${newAccessToken}`;


    response =
        await fetch(
            API_ENDPOINT(path),
            {
                ...options,

                headers:
                    retryHeaders,

                credentials:
                    options.credentials ||
                    "include"
            }
        );


    return response;
}


/* =========================================================
   13. AUTH EVENTS
========================================================= */

window.addEventListener(
    "accessTokenRefreshed",
    (event) => {

        console.log(
            "SkillConnect access token refreshed."
        );

    }
);

window.addEventListener(
    "authSessionExpired",
    () => {

        console.warn(
            "SkillConnect authentication session expired."
        );

    }
);


/* =========================================================
   14. GLOBAL CONFIGURATION LOG
========================================================= */

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