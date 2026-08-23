/* =========================================================
   2. GET FORM ELEMENTS
========================================================= */

const profileForm =
    document.getElementById(
        "clientProfileForm"
    );


const fullNameInput =
    document.getElementById(
        "fullName"
    );


const countrySelect =
    document.getElementById(
        "country"
    );


const stateSelect =
    document.getElementById(
        "state"
    );


const citySelect =
    document.getElementById(
        "city"
    );


const locationInput =
    document.getElementById(
        "location"
    );


const continueBtn =
    document.getElementById(
        "continueBtn"
    );


const completionPercent =
    document.getElementById(
        "completionPercent"
    );



/* =========================================================
   3. NOTIFICATION MODAL ELEMENTS
========================================================= */

const notificationOverlay =
    document.getElementById(
        "notificationOverlay"
    );


const notificationCard =
    document.querySelector(
        ".notification-card"
    );


const notificationIcon =
    document.getElementById(
        "notificationIcon"
    );


const notificationTitle =
    document.getElementById(
        "notificationTitle"
    );


const notificationText =
    document.getElementById(
        "notificationText"
    );


const notificationButton =
    document.getElementById(
        "notificationButton"
    );



/* =========================================================
   4. GET CLIENT EMAIL
========================================================= */

/*
   The client email should have been saved
   during the authentication / OTP flow.
*/

const clientEmail =
    sessionStorage.getItem(
        "clientEmail"
    );



/* =========================================================
   5. NIGERIAN LOCATION DATA
========================================================= */

/*
   Structure:

       State
          ↓
       Cities

   The country is currently Nigeria.
*/

const nigeriaLocations = {

    Abia: [
        "Aba",
        "Arochukwu",
        "Umuahia"
    ],

    Adamawa: [
        "Jimeta",
        "Mubi",
        "Yola"
    ],

    Akwa_Ibom: [
        "Eket",
        "Ikot Ekpene",
        "Uyo"
    ],

    Anambra: [
        "Awka",
        "Nnewi",
        "Onitsha"
    ],

    Bauchi: [
        "Azare",
        "Bauchi",
        "Misau"
    ],

    Bayelsa: [
        "Brass",
        "Yenagoa"
    ],

    Benue: [
        "Gboko",
        "Makurdi",
        "Otukpo"
    ],

    Borno: [
        "Bama",
        "Biu",
        "Maiduguri"
    ],

    Cross_River: [
        "Calabar",
        "Ikom",
        "Ogoja"
    ],

    Delta: [
        "Asaba",
        "Sapele",
        "Warri"
    ],

    Ebonyi: [
        "Abakaliki",
        "Afikpo"
    ],

    Edo: [
        "Benin City",
        "Ekpoma",
        "Auchi"
    ],

    Ekiti: [
        "Ado-Ekiti",
        "Ikere",
        "Ilawe"
    ],

    Enugu: [
        "Enugu",
        "Nsukka",
        "Oji River"
    ],

    Gombe: [
        "Billiri",
        "Gombe",
        "Kaltungo"
    ],

    Imo: [
        "Owerri",
        "Orlu",
        "Okigwe"
    ],

    Jigawa: [
        "Dutse",
        "Hadejia",
        "Gumel"
    ],

    Kaduna: [
        "Kaduna",
        "Kafanchan",
        "Zaria"
    ],

    Kano: [
        "Kano",
        "Wudil",
        "Gaya"
    ],

    Katsina: [
        "Daura",
        "Funtua",
        "Katsina"
    ],

    Kebbi: [
        "Argungu",
        "Birnin Kebbi",
        "Yauri"
    ],

    Kogi: [
        "Idah",
        "Lokoja",
        "Okene"
    ],

    Kwara: [
        "Ilorin",
        "Offa",
        "Jebba"
    ],

    Lagos: [
        "Badagry",
        "Epe",
        "Ikeja",
        "Lagos",
        "Ikorodu"
    ],

    Nasarawa: [
        "Keffi",
        "Lafia",
        "Nasarawa"
    ],

    Niger: [
        "Bida",
        "Minna",
        "Suleja"
    ],

    Ogun: [
        "Abeokuta",
        "Ijebu Ode",
        "Sagamu"
    ],

    Ondo: [
        "Akure",
        "Ondo",
        "Owo"
    ],

    Osun: [
        "Ife",
        "Ilesa",
        "Osogbo"
    ],

    Oyo: [
        "Ibadan",
        "Ogbomoso",
        "Oyo",
        "Iseyin",
        "Eruwa"
    ],

    Plateau: [
        "Barkin Ladi",
        "Jos",
        "Pankshin"
    ],

    Rivers: [
        "Bonny",
        "Port Harcourt",
        "Obio-Akpor"
    ],

    Sokoto: [
        "Sokoto",
        "Tambuwal",
        "Wurno"
    ],

    Taraba: [
        "Jalingo",
        "Wukari",
        "Gembu"
    ],

    Yobe: [
        "Damaturu",
        "Gashua",
        "Potiskum"
    ],

    Zamfara: [
        "Gusau",
        "Kaura Namoda",
        "Talata Mafara"
    ],

    FCT: [
        "Abuja",
        "Gwagwalada",
        "Kuje",
        "Bwari",
        "Kubwa"
    ]

};



/* =========================================================
   6. SHOW NOTIFICATION MODAL
========================================================= */

/*
   ERROR:

       User must manually close.

   SUCCESS + REDIRECT:

       Modal appears
       ↓
       Wait 1.5 seconds
       ↓
       Redirect

   ERROR + REDIRECT:

       Modal appears
       ↓
       Wait 1.5 seconds
       ↓
       Redirect
*/

function showModal(
    type,
    title,
    message,
    redirectURL = null
) {

    if (
        !notificationOverlay ||
        !notificationCard
    ) {

        return;

    }


    /*
       Remove previous modal type.
    */

    notificationCard.classList.remove(
        "error",
        "success",
        "info"
    );


    /*
       Add current modal type.
    */

    notificationCard.classList.add(
        type
    );


    /*
       Display title.
    */

    notificationTitle.textContent =
        title;


    /*
       Display message.
    */

    notificationText.textContent =
        message;


    /*
       Select modal icon.
    */

    if (
        type === "error"
    ) {

        notificationIcon.textContent =
            "×";

    }

    else if (
        type === "success"
    ) {

        notificationIcon.textContent =
            "✓";

    }

    else {

        notificationIcon.textContent =
            "i";

    }


    /*
       Display modal.
    */

    notificationOverlay.hidden =
        false;


    /* =====================================================
       ERROR WITHOUT REDIRECT
    ===================================================== */

    if (
        type === "error" &&
        !redirectURL
    ) {

        notificationButton.textContent =
            "Close";

        return;

    }


    /* =====================================================
       REDIRECT RESPONSE
    ===================================================== */

    if (redirectURL) {

        notificationButton.textContent =
            "Continue";


        /*
           Redirect automatically after
           exactly 1.5 seconds.
        */

        setTimeout(
            () => {

                window.location.href =
                    redirectURL;

            },
            1500
        );

    }

}



/* =========================================================
   7. CLOSE MODAL
========================================================= */

if (notificationButton) {

    notificationButton.addEventListener(
        "click",
        () => {

            notificationOverlay.hidden =
                true;

        }
    );

}



/* =========================================================
   8. CHECK CLIENT EMAIL
========================================================= */

function checkClientEmail() {

    if (!clientEmail) {

        showModal(

            "error",

            "Session Expired",

            "Your client email could not be found. Please return to client authentication.",

            "../client-authentication/index.html"

        );

        return false;

    }


    return true;

}



/* =========================================================
   9. LOAD COUNTRY
========================================================= */

function loadCountry() {

    if (!countrySelect) {

        return;

    }


    /*
       Clear country dropdown.
    */

    countrySelect.innerHTML = "";


    /*
       Placeholder.
    */

    const placeholder =
        document.createElement(
            "option"
        );


    placeholder.value =
        "";


    placeholder.textContent =
        "Select country";


    placeholder.disabled =
        true;


    placeholder.selected =
        true;


    countrySelect.appendChild(
        placeholder
    );


    /*
       Nigeria.
    */

    const nigeriaOption =
        document.createElement(
            "option"
        );


    nigeriaOption.value =
        "Nigeria";


    nigeriaOption.textContent =
        "Nigeria";


    countrySelect.appendChild(
        nigeriaOption
    );

}



/* =========================================================
   10. LOAD NIGERIAN STATES
========================================================= */

function loadStates() {

    if (!stateSelect) {

        return;

    }


    /*
       Clear old states.
    */

    stateSelect.innerHTML = "";


    /*
       Create placeholder.
    */

    const placeholder =
        document.createElement(
            "option"
        );


    placeholder.value =
        "";


    placeholder.textContent =
        "Select state";


    placeholder.disabled =
        true;


    placeholder.selected =
        true;


    stateSelect.appendChild(
        placeholder
    );


    /*
       Get all Nigerian states.
    */

    const states =
        Object.keys(
            nigeriaLocations
        );


    /*
       Add each state.
    */

    states.forEach(
        (state) => {

            const option =
                document.createElement(
                    "option"
                );


            /*
               Convert:

               Akwa_Ibom
                   ↓
               Akwa Ibom
            */

            const displayName =
                state.replace(
                    /_/g,
                    " "
                );


            option.value =
                displayName;


            option.textContent =
                displayName;


            stateSelect.appendChild(
                option
            );

        }
    );


    /*
       =====================================================
       IMPORTANT FIX
       =====================================================

       The HTML starts with:

           disabled

       Therefore we MUST enable the state
       dropdown after loading the states.
    */

    stateSelect.disabled =
        false;


    /*
       Reset city.

       City remains disabled until
       a state is selected.
    */

    if (citySelect) {

        citySelect.disabled =
            true;


        citySelect.innerHTML =
            `<option value="">
                Select state first
             </option>`;

    }


    /*
       Update completion percentage.
    */

    updateCompletion();

}



/* =========================================================
   11. LOAD CITIES
========================================================= */

function loadCities() {

    if (
        !stateSelect ||
        !citySelect
    ) {

        return;

    }


    const selectedState =
        stateSelect.value;


    /*
       Clear existing cities.
    */

    citySelect.innerHTML = "";


    /*
       No state selected.
    */

    if (!selectedState) {

        citySelect.disabled =
            true;


        citySelect.innerHTML =
            `<option value="">
                Select state first
             </option>`;


        updateLocation();

        updateCompletion();

        return;

    }


    /*
       Convert:

       Akwa Ibom
           ↓
       Akwa_Ibom
    */

    const stateKey =
        selectedState.replace(
            / /g,
            "_"
        );


    /*
       Find cities.
    */

    const cities =
        nigeriaLocations[
            stateKey
        ] || [];


    /*
       City placeholder.
    */

    const placeholder =
        document.createElement(
            "option"
        );


    placeholder.value =
        "";


    placeholder.textContent =
        "Select city";


    placeholder.disabled =
        true;


    placeholder.selected =
        true;


    citySelect.appendChild(
        placeholder
    );


    /*
       Add cities.
    */

    cities.forEach(
        (city) => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                city;


            option.textContent =
                city;


            citySelect.appendChild(
                option
            );

        }
    );


    /*
       IMPORTANT:

       Enable city after cities have
       been loaded.
    */

    citySelect.disabled =
        false;


    updateLocation();

    updateCompletion();

}



/* =========================================================
   12. UPDATE FINAL LOCATION
========================================================= */

function updateLocation() {

    if (!locationInput) {

        return;

    }


    const country =
        countrySelect
            ? countrySelect.value
            : "";


    const state =
        stateSelect
            ? stateSelect.value
            : "";


    const city =
        citySelect
            ? citySelect.value
            : "";


    /*
       Build:

       Nigeria, Oyo, Ogbomoso
    */

    if (
        country &&
        state &&
        city
    ) {

        locationInput.value =
            `${country}, ${state}, ${city}`;

    }

    else {

        locationInput.value =
            "";

    }

}



/* =========================================================
   13. UPDATE COMPLETION PERCENTAGE
========================================================= */

function updateCompletion() {

    if (!completionPercent) {

        return;

    }


    let completed =
        0;


    /*
       Full name.
    */

    if (
        fullNameInput &&
        fullNameInput.value.trim()
    ) {

        completed++;

    }


    /*
       Country.
    */

    if (
        countrySelect &&
        countrySelect.value
    ) {

        completed++;

    }


    /*
       State.
    */

    if (
        stateSelect &&
        stateSelect.value
    ) {

        completed++;

    }


    /*
       City.
    */

    if (
        citySelect &&
        citySelect.value
    ) {

        completed++;

    }


    /*
       There are 4 required profile
       values.

       1 = 25%
       2 = 50%
       3 = 75%
       4 = 100%
    */

    const percentage =
        Math.round(
            (completed / 4) * 100
        );


    completionPercent.textContent =
        `${percentage}%`;

}



/* =========================================================
   14. COUNTRY CHANGE
========================================================= */

if (countrySelect) {

    countrySelect.addEventListener(
        "change",
        () => {

            /*
               Currently only Nigeria
               is supported.
            */

            if (
                countrySelect.value ===
                "Nigeria"
            ) {

                loadStates();

            }

            else {

                /*
                   Disable state.
                */

                stateSelect.innerHTML =
                    `<option value="">
                        Select country first
                     </option>`;


                stateSelect.disabled =
                    true;


                /*
                   Disable city.
                */

                citySelect.innerHTML =
                    `<option value="">
                        Select state first
                     </option>`;


                citySelect.disabled =
                    true;

            }


            updateLocation();

            updateCompletion();

        }
    );

}



/* =========================================================
   15. STATE CHANGE
========================================================= */

if (stateSelect) {

    stateSelect.addEventListener(
        "change",
        () => {

            /*
               Load cities belonging
               to the selected state.
            */

            loadCities();

        }
    );

}



/* =========================================================
   16. CITY CHANGE
========================================================= */

if (citySelect) {

    citySelect.addEventListener(
        "change",
        () => {

            /*
               Update:

               Nigeria, Oyo, Ogbomoso
            */

            updateLocation();

            updateCompletion();

        }
    );

}



/* =========================================================
   17. FULL NAME CHANGE
========================================================= */

if (fullNameInput) {

    fullNameInput.addEventListener(
        "input",
        () => {

            updateCompletion();

        }
    );

}



/* =========================================================
   18. VALIDATE FULL NAME
========================================================= */

function validateFullName() {

    if (!fullNameInput) {

        return false;

    }


    const fullName =
        fullNameInput.value.trim();


    /*
       Name cannot be empty.
    */

    if (!fullName) {

        return false;

    }


    /*
       Require at least two words.
    */

    const nameParts =
        fullName.split(
            /\s+/
        );


    if (
        nameParts.length < 2
    ) {

        return false;

    }


    /*
       Minimum name length.
    */

    if (
        fullName.length < 3
    ) {

        return false;

    }


    return true;

}



/* =========================================================
   19. VALIDATE LOCATION
========================================================= */

function validateLocation() {

    if (
        !countrySelect ||
        !stateSelect ||
        !citySelect
    ) {

        return false;

    }


    /*
       Country.
    */

    if (
        !countrySelect.value
    ) {

        return false;

    }


    /*
       State.
    */

    if (
        !stateSelect.value
    ) {

        return false;

    }


    /*
       City.
    */

    if (
        !citySelect.value
    ) {

        return false;

    }


    /*
       Create final location.
    */

    updateLocation();


    if (
        !locationInput.value
    ) {

        return false;

    }


    return true;

}



/* =========================================================
   20. VALIDATE COMPLETE PROFILE
========================================================= */

function validateProfile() {

    /*
       Validate name.
    */

    if (
        !validateFullName()
    ) {
        showModal(

            "error",

            "Invalid Name",

            "Please enter your full name."

        );


        fullNameInput.focus();


        return false;

    }


    /*
       Validate location.
    */

    if (
        !validateLocation()
    ) {

        showModal(

            "error",

            "Incomplete Location",

            "Please select your country, state, and city."

        );


        return false;

    }


    return true;

}



/* =========================================================
   21. SET LOADING STATE
========================================================= */

function setLoading(
    loading
) {

    if (!continueBtn) {

        return;

    }


    if (loading) {

        continueBtn.disabled =
            true;


        continueBtn.classList.add(
            "loading"
        );


        continueBtn.textContent =
            "Saving Profile...";

    }

    else {

        continueBtn.disabled =
            false;


        continueBtn.classList.remove(
            "loading"
        );


        continueBtn.textContent =
            "Continue To Dashboard";

    }

}



/* =========================================================
   22. SUBMIT PROFILE
========================================================= */

if (profileForm) {

    profileForm.addEventListener(
        "submit",
        async (event) => {

            /*
               Stop normal browser submission.
            */

            event.preventDefault();


            /*
               Frontend validation.
            */

            if (
                !validateProfile()
            ) {

                return;

            }


            /*
               Get latest email.
            */

            const currentClientEmail =
                sessionStorage.getItem(
                    "clientEmail"
                );


            /*
               Email missing.
            */

            if (!currentClientEmail) {

                showModal(

                    "error",

                    "Session Expired",

                    "Your client email could not be found. Please return to client authentication.",

                    "../client-authentication/index.html"

                );


                return;

            }


            /*
               Show loading state.
            */

            setLoading(true);


            try {

                /* ==========================================
                   PREPARE PROFILE DATA
                ========================================== */

                const profileData = {

                    clientEmail:
                        currentClientEmail,

                    fullName:
                        fullNameInput.value.trim(),

                    country:
                        countrySelect.value,

                    state:
                        stateSelect.value,

                    city:
                        citySelect.value,

                    location:
                        locationInput.value

                };


                /* ==========================================
                   SEND DATA TO BACKEND
                ========================================== */

                const response =
                    await fetch(

                        API_ENDPOINT("/api/client-create-profile"), {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            credentials:
                                "include",

                            body:
                                JSON.stringify(
                                    profileData
                                )

                        }

                    );


                /* ==========================================
                   READ RESPONSE
                ========================================== */

                const data =
                    await response.json();


                /* ==========================================
                   EMAIL NOT VERIFIED
                ========================================== */

                if (
                    data.code ===
                    "EMAIL_NOT_VERIFIED"
                ) {

                    showModal(

                        "error",

                        "Email Not Verified",

                        data.message ||
                        "Please verify your email before completing your profile.",

                        "../client-email-otp/index.html"

                    );


                    return;

                }


                /* ==========================================
                   OTHER BACKEND ERRORS
                ========================================== */

                if (
                    !response.ok ||
                    !data.success
                ) {

                    showModal(

                        "error",

                        "Profile Creation Failed",

                        data.message ||
                        "We could not save your profile. Please try again."

                    );


                    return;

                }


                /* ==========================================
                   SUCCESS
                ========================================== */

                showModal(

                    "success",

                    "Profile Completed",

                    data.message ||
                    "Your client profile has been created successfully.",

                    "../client-worker-search/index.html"

                );

            }

            catch (error) {

                /*
                   Network error.
                */

                console.error(
                    "Client profile error:",
                    error
                );


                showModal(

                    "error",

                    "Connection Error",

                    "Unable to connect to the SkillConnect server. Please check your connection and try again."

                );

            }

            finally {

                /*
                   Remove loading state.
                */

                setLoading(false);

            }

        }
    );

}



/* =========================================================
   23. INITIALIZE PAGE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /*
           Check client session first.
        */

        if (
            !checkClientEmail()
        ) {

            return;

        }


        /*
           Load Nigeria.
        */

        loadCountry();


        /*
           Load all Nigerian states.

           IMPORTANT:

           loadStates() now also enables
           the state dropdown.
        */

        loadStates();

        updateCompletion();

    }
);