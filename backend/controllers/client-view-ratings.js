const Worker=require("../models/worker");
const{authenticateClient}=require("./client-authentication");

const clientViewRatings=async(req,res)=>{
try{

const authentication=authenticateClient(req);

if(!authentication.valid){
return res.status(
authentication.status
).json({
success:false,
message:authentication.message
});
}

const{workerId,serviceId}=req.body;

if(!workerId||!serviceId){
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
service=>String(service.id)===String(serviceId)
);

if(!service){
return res.status(404).json({
success:false,
message:"Service not found."
});
}

const ratingAndReview=
service.ratingAndReview||[];

const ratings=ratingAndReview.map(review=>({
fullName:review.fullName,
rating:review.rating,
review:review.review,
date:review.date
}));

return res.status(200).json({
success:true,
ratingAndReview:ratings
});

}catch(error){

console.error(
"Client view ratings error:",
error
);

return res.status(500).json({
success:false,
message:"Unable to load ratings and reviews. Please try again."
});

}
};

module.exports=clientViewRatings;