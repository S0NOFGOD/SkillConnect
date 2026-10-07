const loadingState=document.getElementById("loadingState");
const ratingsContent=document.getElementById("ratingsContent");
const errorState=document.getElementById("errorState");
const errorMessage=document.getElementById("errorMessage");
const retryBtn=document.getElementById("retryBtn");
const reviewCount=document.getElementById("reviewCount");
const reviewList=document.getElementById("reviewList");
const backBtn=document.getElementById("backBtn");

const notificationOverlay=document.getElementById("notificationOverlay");
const notificationTitle=document.getElementById("notificationTitle");
const notificationMessage=document.getElementById("notificationMessage");
const notificationButton=document.getElementById("notificationButton");

let authenticationError=false;

function showNotification(title,message,redirect=false){
    notificationTitle.textContent=title;
    notificationMessage.textContent=message;
    notificationOverlay.hidden=false;

    notificationButton.onclick=()=>{
        notificationOverlay.hidden=true;

        if(redirect){
            window.location.href="../client-authentication/index.html";
        }
    };
}

function showAuthenticationError(){
    if(authenticationError)return;

    authenticationError=true;

    loadingState.hidden=true;
    ratingsContent.hidden=true;
    errorState.hidden=true;

    showNotification(
        "Authentication Required",
        "Your session has expired. Please log in again.",
        true
    );
}

window.addEventListener(
    "authSessionExpired",
    showAuthenticationError
);

function formatDate(date){
    if(!date)return "Date unavailable";

    const parsedDate=new Date(date);

    if(Number.isNaN(parsedDate.getTime())){
        return "Date unavailable";
    }

    return parsedDate.toLocaleDateString(
        "en-NG",
        {
            year:"numeric",
            month:"short",
            day:"numeric"
        }
    );
}

function createStars(rating){
    const value=Number(rating)||0;
    const rounded=Math.round(value);

    return "★".repeat(rounded)+"☆".repeat(5-rounded);
}

function displayRatings(reviews){
    reviewList.innerHTML="";

    if(!Array.isArray(reviews)||reviews.length===0){
        reviewCount.textContent="0 Reviews";

        reviewList.innerHTML=`
            <div class="empty-reviews">
                No ratings or reviews yet.
            </div>
        `;

        return;
    }

    reviewCount.textContent=
        `${reviews.length} Review${reviews.length===1?"":"s"}`;

    reviews.forEach(review=>{
        const item=document.createElement("article");

        item.className="review-item";

        item.innerHTML=`
            <div class="review-top">
                <span class="review-name"></span>
                <span class="review-rating"></span>
            </div>

            <p class="review-text"></p>

            <p class="review-date"></p>
        `;

        item.querySelector(".review-name").textContent=
            review.fullName||"Client";

        item.querySelector(".review-rating").textContent=
            `${createStars(review.rating)} ${Number(review.rating)||0}/5`;

        item.querySelector(".review-text").textContent=
            review.review||"No review provided.";

        item.querySelector(".review-date").textContent=
            formatDate(review.date);

        reviewList.appendChild(item);
    });
}

async function loadRatings(){
    authenticationError=false;

    loadingState.hidden=false;
    ratingsContent.hidden=true;
    errorState.hidden=true;

    const workerId=sessionStorage.getItem("workerId");
    const serviceId=sessionStorage.getItem("serviceId");

    if(!workerId||!serviceId){
        loadingState.hidden=true;

        showNotification(
            "Information Required",
            "Worker or service information is missing.",
            true
        );

        return;
    }

    try{
        const response=await API_REQUEST(
            "/api/client-view-ratings",
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
            showAuthenticationError();
            return;
        }

        const data=await response.json();

        if(!response.ok){
            throw new Error(
                data.message||"Unable to load ratings."
            );
        }

        displayRatings(
            data.ratingAndReview||data.reviews||[]
        );

        loadingState.hidden=true;
        ratingsContent.hidden=false;

    }catch(error){
        console.error(
            "Load ratings failed:",
            error
        );

        if(authenticationError)return;

        loadingState.hidden=true;
        ratingsContent.hidden=true;
        errorState.hidden=false;

        errorMessage.textContent=
            error.message||"Something went wrong.";
    }
}

backBtn.addEventListener(
    "click",
    ()=>{
        window.location.href=
            "../client-worker-details/index.html";
    }
);

retryBtn.addEventListener(
    "click",
    loadRatings
);

loadRatings();