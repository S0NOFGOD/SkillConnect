const jwt=require("jsonwebtoken");
const cloudinary=require("cloudinary").v2;
const Worker=require("../models/worker");
const Client=require("../models/client");

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
});

const authenticateClient=req=>{
    const accessToken=req.cookies?.accessToken;

    if(!accessToken){
        return {
            valid:false,
            status:401,
            message:"Authentication required."
        };
    }

    try{

        const decoded=jwt.verify(
            accessToken,
            process.env.ACCESS_TOKEN_SECRET
        );

        if(
            !decoded.userId||
            decoded.userType!=="client"
        ){
            return {
                valid:false,
                status:401,
                message:"Invalid authentication credentials."
            };
        }

        return {
            valid:true,
            userId:decoded.userId
        };

    }catch(error){

        return {
            valid:false,
            status:401,
            message:"Authentication token is invalid or expired."
        };

    }
};


/* =========================
   GET WORKER DETAILS
========================= */

const getWorkerDetails=async(req,res)=>{
try{

    const authentication=authenticateClient(req);

    if(!authentication.valid){

        return res.status(authentication.status).json({
            success:false,
            message:authentication.message
        });

    }

    const workerId=req.body.workerId;
    const id=req.body.serviceId;

    if(!workerId||id===undefined||id===null){

        return res.status(400).json({
            success:false,
            message:"Worker ID and service ID are required."
        });

    }

    const worker=await Worker.findById(workerId);

    if(!worker){

        return res.status(404).json({
            success:false,
            message:"Worker not found."
        });

    }

    const service=worker.services.find(
        service=>String(service.id)===String(id)
    );

    if(!service){

        return res.status(404).json({
            success:false,
            message:"Service not found."
        });

    }

    const ratingAndReview=
        service.ratingAndReview||[];

    const reviewCount=
        ratingAndReview.length;

    const totalRating=
        ratingAndReview.reduce(
            (total,item)=>total+Number(item.rating||0),
            0
        );

    const rating=
        reviewCount?
        totalRating/reviewCount:
        0;

    const topReviews=
        [...ratingAndReview]
        .sort(
            (a,b)=>
                new Date(b.date||0)-
                new Date(a.date||0)
        )
        .slice(0,3)
        .map(review=>({
            clientId:review.clientId,
            clientName:review.fullName,
            rating:review.rating,
            review:review.review,
            date:review.date
        }));

    return res.status(200).json({
        success:true,
        worker:{
            workerId:worker._id,
            profilePhoto:worker.profilePhoto?
                cloudinary.url(worker.profilePhoto,{
                    secure:true
                }):null,
            fullName:worker.fullName,
            phone:worker.phone,
            city:worker.city,
            lga:worker.lga,
            skill:service.skill,
            experience:service.experience,
            description:service.description,
            portfolioPhotos:
                (service.portfolios||[]).map(
                    photo=>
                        cloudinary.url(photo,{
                            secure:true
                        })
                ),
            rating:Number(rating.toFixed(1)),
            reviewCount,
            ratingAndReview:topReviews
        }
    });

}catch(error){

    console.error(
        "Get worker details error:",
        error
    );

    return res.status(500).json({
        success:false,
        message:"Unable to load worker details. Please try again."
    });

}
};


/* =========================
   GET CLIENT RATING
========================= */

const getClientRating=async(req,res)=>{
try{

    const authentication=authenticateClient(req);

    if(!authentication.valid){

        return res.status(authentication.status).json({
            success:false,
            message:authentication.message
        });

    }

    const workerId=req.body.workerId;
    const id=req.body.serviceId;

    if(!workerId||id===undefined||id===null){

        return res.status(400).json({
            success:false,
            message:"Worker ID and service ID are required."
        });

    }

    const worker=await Worker.findById(workerId);

    if(!worker){

        return res.status(404).json({
            success:false,
            message:"Worker not found."
        });

    }

    const service=worker.services.find(
        service=>String(service.id)===String(id)
    );

    if(!service){

        return res.status(404).json({
            success:false,
            message:"Service not found."
        });

    }

    const clientRating=
        (service.ratingAndReview||[]).find(
            review=>
                String(review.clientId)===
                String(authentication.userId)
        );

    if(!clientRating){

        return res.status(200).json({
            success:true,
            rating:null,
            review:""
        });

    }

    return res.status(200).json({
        success:true,
        rating:clientRating.rating,
        review:clientRating.review||""
    });

}catch(error){

    console.error(
        "Get client rating error:",
        error
    );

    return res.status(500).json({
        success:false,
        message:"Unable to retrieve your rating. Please try again."
    });

}
};


/* =========================
   SAVE CLIENT RATING
========================= */

const saveClientRating=async(req,res)=>{
try{

    const authentication=authenticateClient(req);

    if(!authentication.valid){

        return res.status(authentication.status).json({
            success:false,
            message:authentication.message
        });

    }

    const workerId=req.body.workerId;
    const id=req.body.serviceId;
    const rating=Number(req.body.rating);
    const review=
        typeof req.body.review==="string"?
        req.body.review.trim():
        "";

    if(!workerId||id===undefined||id===null){

        return res.status(400).json({
            success:false,
            message:"Worker ID and service ID are required."
        });

    }

    if(!Number.isFinite(rating)||rating<1||rating>5){

        return res.status(400).json({
            success:false,
            message:"Please provide a rating between 1 and 5."
        });

    }

    if(!review){

        return res.status(400).json({
            success:false,
            message:"Please write a review."
        });

    }

    if(review.length<3){

        return res.status(400).json({
            success:false,
            message:"Please write a little more about your experience."
        });

    }

    if(review.length>1000){

        return res.status(400).json({
            success:false,
            message:"Your review cannot exceed 1000 characters."
        });

    }

    const client=await Client.findById(
        authentication.userId
    );

    if(!client){

        return res.status(404).json({
            success:false,
            message:"Client account not found."
        });

    }

    const worker=await Worker.findById(workerId);

    if(!worker){

        return res.status(404).json({
            success:false,
            message:"Worker not found."
        });

    }

    const service=worker.services.find(
        service=>String(service.id)===String(id)
    );

    if(!service){

        return res.status(404).json({
            success:false,
            message:"Service not found."
        });

    }

    if(!Array.isArray(service.ratingAndReview)){
        service.ratingAndReview=[];
    }

    const existingRating=
        service.ratingAndReview.find(
            item=>
                String(item.clientId)===
                String(client._id)
        );

    if(existingRating){

        existingRating.rating=rating;
        existingRating.review=review;
        existingRating.fullName=
            client.fullName||"Client";
        existingRating.date=new Date();

    }else{

        service.ratingAndReview.push({
            clientId:client._id,
            fullName:client.fullName||"Client",
            rating,
            review,
            date:new Date()
        });

    }

    await worker.save();

    return res.status(200).json({
        success:true,
        message:"Your rating and review have been submitted successfully."
    });

}catch(error){

    console.error(
        "Save client rating error:",
        error
    );

    return res.status(500).json({
        success:false,
        message:"Unable to submit your rating. Please try again."
    });

}
};


module.exports={
    getWorkerDetails,
    getClientRating,
    saveClientRating
};