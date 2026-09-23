/* =========================================================
   SKILLCONNECT WORKER CREATE PROFILE
   FRONTEND PROFILE COMPLETION LOGIC
========================================================= */

document.addEventListener("DOMContentLoaded",()=>{

const profilePage=document.getElementById("profilePage");
const form=document.getElementById("workerProfileForm");
const fullNameInput=document.getElementById("fullName");
const phoneInput=document.getElementById("phone");
const profilePhotoInput=document.getElementById("profilePhoto");
const profilePhotoPreview=document.getElementById("profilePhotoPreview");
const profilePhotoPlaceholder=document.getElementById("profilePhotoPlaceholder");
const profilePhotoImage=document.getElementById("profilePhotoImage");
const countrySelect=document.getElementById("country");
const stateSelect=document.getElementById("state");
const citySelect=document.getElementById("city");
const lgaSelect=document.getElementById("lga");
const continueBtn=document.getElementById("continueBtn");
const buttonText=continueBtn.querySelector(".button-text");

const notificationOverlay=document.getElementById("notificationOverlay");
const notificationCard=document.getElementById("notificationCard");
const notificationIcon=document.getElementById("notificationIcon");
const notificationTitle=document.getElementById("notificationTitle");
const notificationText=document.getElementById("notificationText");
const notificationButton=document.getElementById("notificationButton");

const MAX_IMAGE_DIMENSION=1920;
const MAX_COMPRESSED_IMAGE_SIZE=2*1024*1024;

const workerEmail=sessionStorage.getItem("workerEmail");

if(!workerEmail){
    showModal(
        "error",
        "Authentication Required",
        "Your worker session could not be found. Please sign in again.",
        "Go to Login",
        ()=>{
            window.location.href="../worker-authentication/index.html";
        }
    );
    return;
}

profilePage.hidden=false;

countrySelect.innerHTML=`
<option value="">Select country</option>
<option value="Nigeria">Nigeria</option>
`;


/* =====================================================
   PROFILE PHOTO SELECTION
===================================================== */

profilePhotoInput.addEventListener("change",async()=>{

    const file=profilePhotoInput.files[0];

    if(!file){
        profilePhotoImage.hidden=true;
        profilePhotoPlaceholder.hidden=false;
        profilePhotoImage.removeAttribute("src");
        updateProgress();
        return;
    }

    if(!file.type||!file.type.startsWith("image/")){
        profilePhotoInput.value="";
        profilePhotoImage.hidden=true;
        profilePhotoPlaceholder.hidden=false;
        profilePhotoImage.removeAttribute("src");

        showModal(
            "error",
            "Invalid Profile Photo",
            "Please select an image file."
        );

        updateProgress();
        return;
    }

    const imageUrl=URL.createObjectURL(file);

    profilePhotoImage.src=imageUrl;
    profilePhotoImage.hidden=false;
    profilePhotoPlaceholder.hidden=true;

    profilePhotoImage.addEventListener(
        "load",
        ()=>URL.revokeObjectURL(imageUrl),
        {once:true}
    );

    updateProgress();

});


/* =====================================================
   COUNTRY CHANGE
===================================================== */

countrySelect.addEventListener("change",()=>{

    resetSelect(stateSelect,"Select state");
    resetSelect(citySelect,"Select city");
    resetSelect(lgaSelect,"Select LGA");

    stateSelect.disabled=true;
    citySelect.disabled=true;
    lgaSelect.disabled=true;

    const country=countrySelect.value;

    if(!country){
        updateProgress();
        return;
    }

    const countryData=NIGERIAN_LOCATION_DATA[country];

    if(!countryData){
        updateProgress();
        return;
    }

    Object.keys(countryData).forEach(state=>{
        const option=document.createElement("option");
        option.value=state;
        option.textContent=state;
        stateSelect.appendChild(option);
    });

    stateSelect.disabled=false;
    updateProgress();

});


/* =====================================================
   STATE CHANGE
===================================================== */

stateSelect.addEventListener("change",()=>{

    resetSelect(citySelect,"Select city");
    resetSelect(lgaSelect,"Select LGA");

    citySelect.disabled=true;
    lgaSelect.disabled=true;

    const country=countrySelect.value;
    const state=stateSelect.value;

    if(!country||!state){
        updateProgress();
        return;
    }

    const stateData=NIGERIAN_LOCATION_DATA[country]?.[state];

    if(!stateData){
        updateProgress();
        return;
    }

    stateData.cities.forEach(city=>{
        const option=document.createElement("option");
        option.value=city;
        option.textContent=city;
        citySelect.appendChild(option);
    });

    stateData.lgas.forEach(lga=>{
        const option=document.createElement("option");
        option.value=lga;
        option.textContent=lga;
        lgaSelect.appendChild(option);
    });

    citySelect.disabled=false;
    lgaSelect.disabled=false;

    updateProgress();

});


/* =====================================================
   LOCATION FIELD CHANGES
===================================================== */

[
    fullNameInput,
    phoneInput,
    countrySelect,
    stateSelect,
    citySelect,
    lgaSelect
].forEach(element=>{
    element.addEventListener("input",updateProgress);
    element.addEventListener("change",updateProgress);
});


/* =====================================================
   SUBMIT PROFILE
===================================================== */

form.addEventListener("submit",async event=>{

    event.preventDefault();

    const validation=validateForm();

    if(!validation.valid){
        showModal(
            "error",
            "Invalid Information",
            validation.message
        );
        return;
    }

    const phone=normalizePhone(phoneInput.value);

    setLoading(true);

    try{

        const formData=new FormData();

        formData.append("email",workerEmail);
        formData.append(
            "fullName",
            normalizeFullName(fullNameInput.value)
        );
        formData.append("phone",phone);
        formData.append("country",countrySelect.value);
        formData.append("state",stateSelect.value);
        formData.append("city",citySelect.value);
        formData.append("lga",lgaSelect.value);


        /* =========================================
           RESIZE + CONVERT + COMPRESS PROFILE PHOTO
        ========================================= */

        const compressedPhoto=await compressImage(
            profilePhotoInput.files[0]
        );

        formData.append("profilePhoto",compressedPhoto);


        const response=await API_REQUEST(
            "/api/worker/create-profile",
            {
                method:"POST",
                body:formData
            }
        );


        let data={};

        try{
            data=await response.json();
        }catch{
            data={};
        }


        if(!response.ok){
            showModal(
                "error",
                "Profile Update Failed",
                data.message||
                "Unable to complete your profile. Please try again."
            );
            return;
        }


        sessionStorage.removeItem("workerEmail");

        showModal(
            "success",
            "Profile Completed",
            data.message||
            "Your worker profile has been completed successfully.",
            "Continue",
            ()=>{
                window.location.href=
                    "../worker-dashboard/index.html";
            }
        );

    }catch(error){

        console.error(
            "Worker profile request failed:",
            error
        );

        showModal(
            "error",
            "Connection Error",
            error.message||
            "Unable to connect to the server. Please try again."
        );

    }finally{

        setLoading(false);

    }

});


/* =====================================================
   NOTIFICATION BUTTON
===================================================== */

notificationButton.addEventListener(
    "click",
    ()=>closeModal()
);


/* =====================================================
   INITIAL PROGRESS
===================================================== */

updateProgress();


/* =====================================================
   RESET SELECT HELPER
===================================================== */

function resetSelect(select,placeholder){

    select.innerHTML="";

    const option=document.createElement("option");

    option.value="";
    option.textContent=placeholder;

    select.appendChild(option);

}


/* =====================================================
   NORMALIZE NIGERIAN PHONE NUMBER
===================================================== */

function normalizePhone(value){

    let phone=value
        .trim()
        .replace(/\s+/g,"")
        .replace(/-/g,"")
        .replace(/\(/g,"")
        .replace(/\)/g,"");

    if(/^0[789]\d{9}$/.test(phone)){
        phone="+234"+phone.substring(1);
    }else if(/^234[789]\d{9}$/.test(phone)){
        phone="+"+phone;
    }

    return phone;

}


/* =====================================================
   FULL NAME NORMALIZATION
===================================================== */

function normalizeNamePart(name){

    return name
        .toLowerCase()
        .split(/([-'])/)
        .map(part=>{
            if(part==="-"||part==="'")return part;
            return part.charAt(0).toUpperCase()+part.slice(1);
        })
        .join("");

}

function normalizeFullName(value){

    const fullName=String(value||"")
        .trim()
        .replace(/\s+/g," ");

    const nameParts=fullName.split(" ");

    if(nameParts.length!==2)return null;

    const namePattern=/^[A-Za-zÀ-ÿ]+(?:[-'][A-Za-zÀ-ÿ]+)*$/;

    if(
        !namePattern.test(nameParts[0])||
        !namePattern.test(nameParts[1])
    )return null;

    return nameParts.map(normalizeNamePart).join(" ");

}


/* =====================================================
   RESIZE + CONVERT + COMPRESS IMAGE
===================================================== */

function compressImage(file){

    return new Promise((resolve,reject)=>{

        const image=new Image();
        const objectUrl=URL.createObjectURL(file);

        image.onload=()=>{

            URL.revokeObjectURL(objectUrl);

            let width=image.width;
            let height=image.height;


            /* =========================================
               RESIZE TO MAXIMUM 1920px
            ========================================= */

            if(
                width>MAX_IMAGE_DIMENSION||
                height>MAX_IMAGE_DIMENSION
            ){

                if(width>height){

                    height=Math.round(
                        height*(MAX_IMAGE_DIMENSION/width)
                    );

                    width=MAX_IMAGE_DIMENSION;

                }else{

                    width=Math.round(
                        width*(MAX_IMAGE_DIMENSION/height)
                    );

                    height=MAX_IMAGE_DIMENSION;

                }

            }


            const canvas=document.createElement("canvas");

            canvas.width=width;
            canvas.height=height;

            const context=canvas.getContext("2d");

            if(!context){
                reject(
                    new Error(
                        "The selected image could not be processed."
                    )
                );
                return;
            }


            context.drawImage(
                image,
                0,
                0,
                width,
                height
            );


            /* =========================================
               CONVERT TO JPEG + COMPRESS
            ========================================= */

            canvas.toBlob(blob=>{

                if(!blob){
                    reject(
                        new Error(
                            "The selected image could not be processed."
                        )
                    );
                    return;
                }


                if(blob.size>MAX_COMPRESSED_IMAGE_SIZE){

                    canvas.toBlob(
                        smallerBlob=>{

                            if(!smallerBlob){
                                reject(
                                    new Error(
                                        "The selected image could not be compressed."
                                    )
                                );
                                return;
                            }

                            resolve(
                                new File(
                                    [smallerBlob],
                                    `${file.name.replace(/\.[^/.]+$/,"")}.jpg`,
                                    {type:"image/jpeg"}
                                )
                            );

                        },
                        "image/jpeg",
                        0.65
                    );

                    return;

                }


                resolve(
                    new File(
                        [blob],
                        `${file.name.replace(/\.[^/.]+$/,"")}.jpg`,
                        {type:"image/jpeg"}
                    )
                );

            },"image/jpeg",0.8);

        };


        image.onerror=()=>{

            URL.revokeObjectURL(objectUrl);

            reject(
                new Error(
                    "The selected image could not be processed."
                )
            );

        };


        image.src=objectUrl;

    });

}


/* =====================================================
   VALIDATE FORM
===================================================== */

function validateForm(){

    const fullName=fullNameInput.value.trim();
    const phone=normalizePhone(phoneInput.value);
    const profilePhoto=profilePhotoInput.files[0];
    const country=countrySelect.value;
    const state=stateSelect.value;
    const city=citySelect.value;
    const lga=lgaSelect.value;


    if(!profilePhoto){
        return{
            valid:false,
            message:"Please select a profile photo."
        };
    }


    if(
        !profilePhoto.type||
        !profilePhoto.type.startsWith("image/")
    ){
        return{
            valid:false,
            message:"Please select an image file."
        };
    }


    const normalizedFullName=
        normalizeFullName(fullName);

    if(!normalizedFullName){
        return{
            valid:false,
            message:
                "Please enter exactly two names with a space between them, for example: Destiny Okpone."
        };
    }

    fullNameInput.value=normalizedFullName;


    if(!/^\+234[789]\d{9}$/.test(phone)){
        return{
            valid:false,
            message:
                "Please enter a valid Nigerian phone number."
        };
    }


    if(!country){
        return{
            valid:false,
            message:"Please select your country."
        };
    }


    if(!state){
        return{
            valid:false,
            message:"Please select your state."
        };
    }


    if(!city){
        return{
            valid:false,
            message:"Please select your city."
        };
    }


    if(!lga){
        return{
            valid:false,
            message:"Please select your LGA."
        };
    }


    return{
        valid:true,
        message:""
    };

}


/* =====================================================
   UPDATE PROFILE PROGRESS
===================================================== */

function updateProgress(){

    const fields=[
        profilePhotoInput.files.length>0,
        fullNameInput.value.trim(),
        normalizePhone(phoneInput.value),
        countrySelect.value,
        stateSelect.value,
        citySelect.value,
        lgaSelect.value
    ];

    const completed=fields.filter(Boolean).length;

    const percentage=Math.round(
        (completed/fields.length)*100
    );

    const progressFill=
        document.getElementById("progressFill");

    const progressPercentage=
        document.getElementById("progressPercentage");

    if(progressFill){
        progressFill.style.width=`${percentage}%`;
    }

    if(progressPercentage){
        progressPercentage.textContent=`${percentage}%`;
    }

}


/* =====================================================
   BUTTON LOADING STATE
===================================================== */

function setLoading(isLoading){

    continueBtn.disabled=isLoading;

    continueBtn.classList.toggle(
        "loading",
        isLoading
    );

    if(buttonText){
        buttonText.textContent=
            isLoading
                ?"Saving Profile..."
                :"Continue";
    }

}


/* =====================================================
   SHOW NOTIFICATION MODAL
===================================================== */

function showModal(
    type,
    title,
    message,
    buttonLabel="Close",
    onClose=null
){

    notificationCard.className=
        `notification-card ${type}`;

    notificationIcon.textContent=
        type==="success"
            ?"✓"
            :type==="error"
                ?"!"
                :"i";

    notificationTitle.textContent=title;
    notificationText.textContent=message;
    notificationButton.textContent=buttonLabel;

    notificationButton.onclick=()=>{

        closeModal();

        if(onClose)onClose();

    };

    notificationOverlay.hidden=false;

    document.body.classList.add("modal-open");

}


/* =====================================================
   CLOSE NOTIFICATION MODAL
===================================================== */

function closeModal(){

    notificationOverlay.hidden=true;

    document.body.classList.remove(
        "modal-open"
    );

}

});