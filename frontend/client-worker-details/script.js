document.addEventListener("DOMContentLoaded",()=>{

const loadingState=document.getElementById("loadingState");
const workerContent=document.getElementById("workerContent");
const errorState=document.getElementById("errorState");
const errorMessage=document.getElementById("errorMessage");
const retryBtn=document.getElementById("retryBtn");

const backBtn=document.getElementById("backBtn");
const seeMoreBtn=document.getElementById("seeMoreBtn");
const contactWorkerBtn=document.getElementById("contactWorkerBtn");
const rateWorkerBtn=document.getElementById("rateWorkerBtn");

const workerPhoto=document.getElementById("workerPhoto");
const workerName=document.getElementById("workerName");
const workerSkill=document.getElementById("workerSkill");
const workerLocation=document.getElementById("workerLocation");
const workerDescription=document.getElementById("workerDescription");

const infoSkill=document.getElementById("infoSkill");
const infoExperience=document.getElementById("infoExperience");
const infoLocation=document.getElementById("infoLocation");
const infoRating=document.getElementById("infoRating");

const portfolioGrid=document.getElementById("portfolioGrid");
const reviewList=document.getElementById("reviewList");

const notificationOverlay=document.getElementById("notificationOverlay");
const notificationTitle=document.getElementById("notificationTitle");
const notificationMessage=document.getElementById("notificationMessage");
const notificationButton=document.getElementById("notificationButton");

const ratingOverlay=document.getElementById("ratingOverlay");
const ratingInput=document.getElementById("ratingInput");
const reviewInput=document.getElementById("reviewInput");
const ratingCancelButton=document.getElementById("ratingCancelButton");
const ratingSubmitButton=document.getElementById("ratingSubmitButton");

const workerId=sessionStorage.getItem("workerId");
const serviceId=sessionStorage.getItem("serviceId");

let workerData=null;
let authenticationExpired=false;

function showLoading(){

    loadingState.hidden=false;
    workerContent.hidden=true;
    errorState.hidden=true;

}

function hideLoading(){

    loadingState.hidden=true;

}

function showError(message){

    loadingState.hidden=true;
    workerContent.hidden=true;
    errorState.hidden=false;
    errorMessage.textContent=message;

}

function showNotification(title,message){

    notificationTitle.textContent=title;
    notificationMessage.textContent=message;
    notificationOverlay.hidden=false;

}

function closeNotification(){

    notificationOverlay.hidden=true;

    if(authenticationExpired){

        authenticationExpired=false;

        window.location.href=
            "../client-authentication/index.html";

    }

}

notificationButton.addEventListener(
    "click",
    closeNotification
);

notificationOverlay.addEventListener(
    "click",
    event=>{

        if(event.target===notificationOverlay){
            closeNotification();
        }

    }
);

window.addEventListener(
    "authSessionExpired",
    ()=>{

        authenticationExpired=true;

        showNotification(
            "Authentication Required",
            "Your session has expired. Please log in again."
        );

    }
);

function openRatingModal(){

    ratingOverlay.hidden=false;

}

function closeRatingModal(){

    ratingOverlay.hidden=true;

}

ratingCancelButton.addEventListener(
    "click",
    closeRatingModal
);

ratingOverlay.addEventListener(
    "click",
    event=>{

        if(event.target===ratingOverlay){
            closeRatingModal();
        }

    }
);

async function loadWorkerDetails(){

    showLoading();

    if(!workerId||!serviceId){

        showError(
            "Worker information could not be found."
        );

        return;

    }

    try{

        const response=await API_REQUEST(
            "/api/client-worker-details",
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify({
                    workerId,
                    serviceId
                })
            }
        );

        if(response.status===401){

            return;

        }

        const data=await response.json();

        if(!response.ok){

            showError(
                data.message||
                "Unable to load worker details."
            );

            return;

        }

        workerData=data.worker||data;

        displayWorker(workerData);

    }catch(error){

        console.error(
            "Worker details request failed:",
            error
        );

        showError(
            "Unable to connect to the server. Please try again."
        );

    }

}

function displayWorker(data){

    workerPhoto.src=data.profilePhoto||"";
    workerPhoto.alt=
        `${data.fullName||"Worker"} profile photo`;

    workerName.textContent=
        data.fullName||"-";

    workerSkill.textContent=
        data.skill||"-";

    const location=
        [data.city,data.lga]
        .filter(Boolean)
        .join(", ")||"-";

    workerLocation.textContent=location;

    workerDescription.textContent=
        data.description||"-";

    infoSkill.textContent=
        data.skill||"-";

    infoExperience.textContent=
        data.experience||"-";

    infoLocation.textContent=
        location;

    const rating=
        Number(data.rating)||0;

    const reviewCount=
        Number(data.reviewCount)||
        (Array.isArray(data.ratingAndReview)?
        data.ratingAndReview.length:0);

    infoRating.textContent=
        `⭐ ${rating.toFixed(1)} (${reviewCount} Reviews)`;

    displayPortfolio(
        data.portfolioPhotos||[]
    );

    displayReviews(
        data.ratingAndReview||[]
    );

    contactWorkerBtn.dataset.phone=
        data.phone||"";

    hideLoading();
    workerContent.hidden=false;

}

function displayPortfolio(photos){

    portfolioGrid.innerHTML="";

    if(!photos.length){

        portfolioGrid.innerHTML=
            `<p class="empty-reviews">No portfolio photos available.</p>`;

        return;

    }

    photos.forEach(photo=>{

        const image=document.createElement("img");

        image.src=photo;
        image.alt="Worker portfolio";
        image.loading="lazy";

        portfolioGrid.appendChild(image);

    });

}

function displayReviews(reviews){

    reviewList.innerHTML="";

    if(!reviews.length){

        reviewList.innerHTML=
            `<p class="empty-reviews">No ratings or reviews yet.</p>`;

        return;

    }

    reviews.slice(0,3).forEach(review=>{

        const reviewItem=
            document.createElement("div");

        reviewItem.className="review-item";

        const reviewTop=
            document.createElement("div");

        reviewTop.className="review-top";

        const reviewName=
            document.createElement("span");

        reviewName.className="review-name";

        reviewName.textContent=
            review.clientName||
            "Client";

        const reviewRating=
            document.createElement("span");

        reviewRating.className="review-rating";

        reviewRating.textContent=
            `⭐ ${review.rating}/5`;

        reviewTop.appendChild(reviewName);
        reviewTop.appendChild(reviewRating);

        const reviewText=
            document.createElement("p");

        reviewText.className="review-text";

        reviewText.textContent=
            review.review||"";

        const reviewDate=
            document.createElement("p");

        reviewDate.className="review-date";

        reviewDate.textContent=
            formatDate(review.date);

        reviewItem.appendChild(reviewTop);
        reviewItem.appendChild(reviewText);
        reviewItem.appendChild(reviewDate);

        reviewList.appendChild(reviewItem);

    });

}

function formatDate(date){

    if(!date)return "-";

    const parsedDate=new Date(date);

    if(Number.isNaN(parsedDate.getTime()))return "-";

    return parsedDate.toLocaleDateString(
        "en-NG",
        {
            day:"numeric",
            month:"short",
            year:"numeric"
        }
    );

}

backBtn.addEventListener(
    "click",
    ()=>{

        window.location.href=
            "../client-workers-search/index.html";

    }
);

seeMoreBtn.addEventListener(
    "click",
    ()=>{

        window.location.href=
            "../client-view-ratings/index.html";

    }
);

contactWorkerBtn.addEventListener(
    "click",
    async()=>{

        if(!workerId)return;

        contactWorkerBtn.disabled=true;
        contactWorkerBtn.textContent="Connecting...";

        try{

            const response=await API_REQUEST(
                "/api/client-worker-details/contact",
                {
                    method:"POST",
                    headers:{
                        "Content-Type":"application/json"
                    },
                    body:JSON.stringify({
                        workerId
                    })
                }
            );

            if(response.status===401)return;

            const data=await response.json();

            if(!response.ok){

                showNotification(
                    "Unable to Contact Worker",
                    data.message||
                    "Unable to contact this worker."
                );

                return;

            }

            const phone=
                data.phone||
                contactWorkerBtn.dataset.phone;

            if(!phone){

                showNotification(
                    "Phone Number Unavailable",
                    "This worker's phone number is not available."
                );

                return;

            }

            window.location.href=`tel:${phone}`;

        }catch(error){

            console.error(
                "Contact worker request failed:",
                error
            );

            showNotification(
                "Connection Error",
                "Unable to contact this worker. Please try again."
            );

        }finally{

            contactWorkerBtn.disabled=false;
            contactWorkerBtn.textContent="Contact Worker";

        }

    }
);

rateWorkerBtn.addEventListener(
    "click",
    async()=>{

        if(!workerId||!serviceId)return;

        rateWorkerBtn.disabled=true;
        rateWorkerBtn.textContent="Connecting...";

        try{

            const response=await API_REQUEST(
                "/api/client-worker-details/rating",
                {
                    method:"POST",
                    headers:{
                        "Content-Type":"application/json"
                    },
                    body:JSON.stringify({
                        workerId,
                        serviceId
                    })
                }
            );

            if(response.status===401)return;

            const data=await response.json();

            if(!response.ok){

                showNotification(
                    "Unable to Load Rating",
                    data.message||
                    "Unable to retrieve your rating."
                );

                return;

            }

            ratingInput.value=
                data.rating?
                String(data.rating):"";

            reviewInput.value=
                data.review||"";

            openRatingModal();

        }catch(error){

            console.error(
                "Rating retrieval failed:",
                error
            );

            showNotification(
                "Connection Error",
                "Unable to retrieve your rating. Please try again."
            );

        }finally{

            rateWorkerBtn.disabled=false;
            rateWorkerBtn.textContent="Rate Worker";

        }

    }
);

ratingSubmitButton.addEventListener(
    "click",
    async()=>{

        const rating=
            ratingInput.value.trim();

        const review=
            reviewInput.value.trim();

        if(!rating){

            showNotification(
                "Rating Required",
                "Please select a rating."
            );

            return;

        }

        if(!review){

            showNotification(
                "Review Required",
                "Please write a review."
            );

            return;

        }

        if(review.length<3){

            showNotification(
                "Review Too Short",
                "Please write a little more about your experience."
            );

            return;

        }

        if(review.length>1000){

            showNotification(
                "Review Too Long",
                "Your review cannot exceed 1000 characters."
            );

            return;

        }

        ratingSubmitButton.disabled=true;
        ratingCancelButton.disabled=true;
        ratingSubmitButton.textContent="Connecting...";

        try{

            if(!workerId||!serviceId){

                showNotification(
                    "Worker Information Missing",
                    "Worker information could not be found."
                );

                return;

            }

            const response=await API_REQUEST(
                "/api/client-worker-details/rating",
                {
                    method:"PUT",
                    headers:{
                        "Content-Type":"application/json"
                    },
                    body:JSON.stringify({
                        workerId,
                        serviceId,
                        rating:Number(rating),
                        review
                    })
                }
            );

            if(response.status===401)return;

            const data=await response.json();

            if(!response.ok){

                showNotification(
                    "Rating Failed",
                    data.message||
                    "Unable to submit your rating."
                );

                return;

            }

            closeRatingModal();

            showNotification(
                "Rating Submitted",
                data.message||
                "Your rating and review have been submitted successfully."
            );

            await loadWorkerDetails();

        }catch(error){

            console.error(
                "Rating submission failed:",
                error
            );

            showNotification(
                "Connection Error",
                "Unable to submit your rating. Please try again."
            );

        }finally{

            ratingSubmitButton.disabled=false;
            ratingCancelButton.disabled=false;
            ratingSubmitButton.textContent="Rate Worker";

        }

    }
);

retryBtn.addEventListener(
    "click",
    loadWorkerDetails
);

loadWorkerDetails();

});