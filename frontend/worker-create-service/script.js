const createServicePage=document.getElementById("createServicePage");
const serviceForm=document.getElementById("serviceForm");
const skillInput=document.getElementById("skill");
const experienceInput=document.getElementById("experience");
const descriptionInput=document.getElementById("description");
const descriptionWordCount=document.getElementById("descriptionWordCount");
const portfolioPhoto1=document.getElementById("portfolioPhoto1");
const portfolioPhoto2=document.getElementById("portfolioPhoto2");
const portfolioPhoto3=document.getElementById("portfolioPhoto3");
const portfolioPreview1=document.getElementById("portfolioPreview1");
const portfolioPreview2=document.getElementById("portfolioPreview2");
const portfolioPreview3=document.getElementById("portfolioPreview3");
const addServiceBtn=document.getElementById("addServiceBtn");
const buttonText=addServiceBtn?.querySelector(".button-text");
const buttonLoader=addServiceBtn?.querySelector(".button-loader");

const notificationOverlay=document.getElementById("notificationOverlay");
const notificationCard=document.getElementById("notificationCard");
const notificationCancelButton=document.getElementById("notificationCancelButton");
const notificationIcon=document.getElementById("notificationIcon");
const notificationTitle=document.getElementById("notificationTitle");
const notificationText=document.getElementById("notificationText");
const notificationButton=document.getElementById("notificationButton");

const MAX_DESCRIPTION_WORDS=150;
const MAX_COMPRESSED_IMAGE_SIZE=2*1024*1024;
const MAX_IMAGE_DIMENSION=1920;
const CREATE_SERVICE_ENDPOINT="/api/worker/create-service";
const AUTHENTICATION_REDIRECT="../worker-add-service/index.html";
const SERVICES_REDIRECT="../worker-services/index.html";

const DEFAULT_LOCAL_SKILLS=[
"Swimming Instructor","Barber","Hairdresser","Makeup Artist","Tailor",
"Bricklayer","Plumber","Electrician","Painter","Welder","Carpenter",
"Bricklayer","Cleaner","Laundry Service","Mechanic","Auto Electrician",
"Phone Repair","Computer Repair","Graphic Designer","Web Developer",
"Photographer","Videographer","Caterer","Baker","Cook","Event Planner",
"Interior Decorator","AC Technician","Generator Repair","POP Installer",
"Tiler","Furniture Maker","Driver","Tutor","Fitness Trainer","Other"
];

let isAddingService=false;
let modalCloseCallback=null;

function getLocalSkills(){
    return Array.isArray(window.LOCAL_SKILLS)&&window.LOCAL_SKILLS.length
        ?window.LOCAL_SKILLS:DEFAULT_LOCAL_SKILLS;
}

function populateSkillDropdown(){
    if(!skillInput)return;
    skillInput.innerHTML="";
    const placeholder=document.createElement("option");
    placeholder.value="";
    placeholder.textContent="Select your skill";
    placeholder.disabled=true;
    placeholder.selected=true;
    skillInput.appendChild(placeholder);

    getLocalSkills().forEach(skill=>{
        const option=document.createElement("option");
        option.value=skill;
        option.textContent=skill;
        skillInput.appendChild(option);
    });
}

function setButtonLoading(button,isLoading,loadingText="Processing..."){
    if(!button)return;

    if(!button.dataset.originalText&&button.querySelector(".button-text"))
        button.dataset.originalText=button.querySelector(".button-text").textContent;

    const textElement=button.querySelector(".button-text");
    const loaderElement=button.querySelector(".button-loader");

    button.disabled=isLoading;
    button.classList.toggle("is-loading",isLoading);

    if(textElement)
        textElement.textContent=isLoading?loadingText:(button.dataset.originalText||"Add A Service");

    if(loaderElement)
        loaderElement.hidden=!isLoading;
}

const MODAL_ICONS={success:"✓",error:"!",info:"i",confirm:"?"};

function showNotification(type,title,message,onClose=null){
    if(!notificationOverlay||!notificationCard)return;

    modalCloseCallback=onClose;
    notificationCard.classList.remove("success","error","info","confirm");
    notificationCard.classList.add(type);
    notificationIcon.textContent=MODAL_ICONS[type]||"!";
    notificationTitle.textContent=title;
    notificationText.textContent=message;
    notificationButton.disabled=false;
    notificationButton.textContent="Continue";
    notificationOverlay.hidden=false;
    document.body.style.overflow="hidden";

    setTimeout(()=>notificationButton.focus(),0);
}

function closeNotification(){
    if(!notificationOverlay)return;

    notificationOverlay.hidden=true;
    document.body.style.overflow="";

    const callback=modalCloseCallback;
    modalCloseCallback=null;

    if(typeof callback==="function")callback();
}

notificationCancelButton?.addEventListener("click",closeNotification);
notificationButton?.addEventListener("click",closeNotification);

document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&notificationOverlay&&!notificationOverlay.hidden)
        closeNotification();
});

function showAuthenticationError(
    message="Your login session has expired. Please log in again."
){
    showNotification(
        "error",
        "Authentication Required",
        message,
        ()=>window.location.href=AUTHENTICATION_REDIRECT
    );
}

function checkAccessToken(){
    const accessToken=getAccessToken();

    if(!accessToken){
        if(createServicePage)createServicePage.hidden=true;

        showAuthenticationError(
            "Your login session could not be found. Please log in again."
        );

        return false;
    }

    if(createServicePage)createServicePage.hidden=false;
    return true;
}

window.addEventListener("authSessionExpired",()=>{
    isAddingService=false;
    setButtonLoading(addServiceBtn,false);

    if(notificationOverlay&&!notificationOverlay.hidden)return;
    showAuthenticationError();
});

function countWords(text){
    return text.length;
}

function updateDescriptionWordCount(){
    if(!descriptionInput||!descriptionWordCount)return;

    const characterCount=descriptionInput.value.length;

    descriptionWordCount.textContent=
        `${characterCount} / ${MAX_DESCRIPTION_WORDS} words`;

    descriptionWordCount.classList.toggle(
        "limit-reached",
        characterCount>=MAX_DESCRIPTION_WORDS
    );
}

descriptionInput?.addEventListener("input",()=>{
    if(descriptionInput.value.length>MAX_DESCRIPTION_WORDS)
        descriptionInput.value=descriptionInput.value.slice(0,MAX_DESCRIPTION_WORDS);

    updateDescriptionWordCount();
});

function restorePortfolioPreview(preview){
    if(!preview)return;

    preview.innerHTML=`
        <span class="portfolio-placeholder" aria-hidden="true">+</span>
        <span>Add Image</span>
    `;
}

function validatePortfolioImageType(file){
    if(!file)return{valid:true};

    if(!file.type||!file.type.startsWith("image/")){
        return{
            valid:false,
            message:`"${file.name}" is not a supported image file.`
        };
    }

    return{valid:true};
}

function validateSelectedPortfolioImage(input,preview){
    const file=input?.files?.[0]||null;

    if(!file){
        restorePortfolioPreview(preview);
        return true;
    }

    const typeResult=validatePortfolioImageType(file);

    if(!typeResult.valid){
        input.value="";
        restorePortfolioPreview(preview);

        showNotification(
            "error",
            "Invalid Image",
            typeResult.message
        );

        return false;
    }

    showImagePreview(input,preview);
    return true;
}

function showImagePreview(input,preview){
    if(!input||!preview)return;

    const file=input.files?.[0];

    if(!file){
        restorePortfolioPreview(preview);
        return;
    }

    const imageUrl=URL.createObjectURL(file);
    preview.innerHTML="";

    const image=document.createElement("img");
    image.src=imageUrl;
    image.alt="Selected portfolio image";
    preview.appendChild(image);

    image.addEventListener(
        "load",
        ()=>URL.revokeObjectURL(imageUrl),
        {once:true}
    );
}

portfolioPhoto1?.addEventListener(
    "change",
    ()=>validateSelectedPortfolioImage(portfolioPhoto1,portfolioPreview1)
);

portfolioPhoto2?.addEventListener(
    "change",
    ()=>validateSelectedPortfolioImage(portfolioPhoto2,portfolioPreview2)
);

portfolioPhoto3?.addEventListener(
    "change",
    ()=>validateSelectedPortfolioImage(portfolioPhoto3,portfolioPreview3)
);

function validatePortfolioPhotos(){
    const portfolioFiles=[
        portfolioPhoto1?.files?.[0]||null,
        portfolioPhoto2?.files?.[0]||null,
        portfolioPhoto3?.files?.[0]||null
    ];

    for(const file of portfolioFiles){
        if(!file)continue;

        const typeResult=validatePortfolioImageType(file);

        if(!typeResult.valid)return typeResult;
    }

    return{valid:true};
}

function validateDescription(){
    const description=descriptionInput?.value.trim()||"";

    if(!description){
        return{
            valid:false,
            message:"Please enter a description for the service."
        };
    }

    const characterCount=description.length;

    if(characterCount>MAX_DESCRIPTION_WORDS){
        return{
            valid:false,
            message:"Your service description cannot contain more than 150 characters."
        };
    }

    return{valid:true};
}

function validateServiceForm(){
    if(!skillInput||!skillInput.value.trim()){
        return{
            valid:false,
            message:"Please select your skill."
        };
    }

    if(!experienceInput||!experienceInput.value.trim()){
        return{
            valid:false,
            message:"Please select your experience."
        };
    }

    const descriptionResult=validateDescription();

    if(!descriptionResult.valid)return descriptionResult;

    const portfolioResult=validatePortfolioPhotos();

    if(!portfolioResult.valid)return portfolioResult;

    return{valid:true};
}

async function extractResponseMessage(response){
    try{
        const data=await response.json();

        return data.message||
            data.error||
            data.errorMessage||
            data.msg||
            "Something went wrong. Please try again.";
    }catch(error){
        console.error("Unable to read backend response:",error);
        return"Something went wrong. Please try again.";
    }
}

function compressImage(file){
    return new Promise((resolve,reject)=>{
        const image=new Image();
        const objectUrl=URL.createObjectURL(file);

        image.onload=()=>{
            URL.revokeObjectURL(objectUrl);

            let width=image.width;
            let height=image.height;

            if(width>MAX_IMAGE_DIMENSION||height>MAX_IMAGE_DIMENSION){
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
                        "Image compression is not supported on this device."
                    )
                );
                return;
            }

            context.drawImage(image,0,0,width,height);

            canvas.toBlob(
                blob=>{
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
                },
                "image/jpeg",
                0.8
            );
        };

        image.onerror=()=>{
            URL.revokeObjectURL(objectUrl);

            reject(
                new Error(
                    `"${file.name}" could not be processed. Please choose a JPG or PNG image.`
                )
            );
        };

        image.src=objectUrl;
    });
}

async function buildServiceFormData(){
    const formData=new FormData();

    formData.append("skill",skillInput.value.trim());
    formData.append("experience",experienceInput.value.trim());
    formData.append("description",descriptionInput.value.trim());

    const files=[
        portfolioPhoto1?.files?.[0]||null,
        portfolioPhoto2?.files?.[0]||null,
        portfolioPhoto3?.files?.[0]||null
    ];

    for(const file of files){
        if(!file)continue;

        const compressedFile=await compressImage(file);

        formData.append(
            "portfolioPhotos",
            compressedFile
        );
    }

    return formData;
}

async function createService(){
    if(isAddingService)return;

    if(!getAccessToken()){
        showAuthenticationError();
        return;
    }

    const validationResult=validateServiceForm();

    if(!validationResult.valid){
        showNotification(
            "error",
            "Invalid Service",
            validationResult.message
        );
        return;
    }

    isAddingService=true;

    setButtonLoading(
        addServiceBtn,
        true,
        "Adding Service..."
    );

    try{
        const formData=await buildServiceFormData();

        const response=await API_REQUEST(
            CREATE_SERVICE_ENDPOINT,
            {
                method:"POST",
                body:formData
            }
        );

        if(response.status===401){
            showAuthenticationError();
            return;
        }

        if(!response.ok){
            const message=await extractResponseMessage(response);

            showNotification(
                "error",
                "Unable To Add Service",
                message
            );

            return;
        }

        let successMessage="Your service has been added successfully.";

        try{
            const data=await response.json();

            if(data.message)
                successMessage=data.message;

        }catch(error){
            console.log("No JSON success response returned.");
        }

        isAddingService=false;
        setButtonLoading(addServiceBtn,false);

        showNotification(
            "success",
            "Service Added",
            successMessage,
            ()=>window.location.href=SERVICES_REDIRECT
        );

        return;

    }catch(error){
        console.error("Create service request failed:",error);

        showNotification(
            "error",
            "Request Failed",
            error.message||
            "We could not add your service right now. Please try again."
        );

    }finally{
        isAddingService=false;
        setButtonLoading(addServiceBtn,false);
    }
}

serviceForm?.addEventListener("submit",event=>{
    event.preventDefault();
    createService();
});

function initializeCreateServicePage(){
    populateSkillDropdown();
    updateDescriptionWordCount();
    checkAccessToken();
}

initializeCreateServicePage();