/* =========================================================
   SKILLCONNECT LOCATION CONTROLLER
========================================================= */

const axios=require("axios");


/* =========================================================
   GET LOCATION
========================================================= */

const getLocation=async(req,res)=>{
    try{
        const latitude=Number(req.query.latitude);
        const longitude=Number(req.query.longitude);

        if(!Number.isFinite(latitude)||!Number.isFinite(longitude)){
            return res.status(400).json({
                success:false,
                code:"INVALID_COORDINATES",
                message:"Valid location coordinates are required."
            });
        }

        if(latitude<-90||latitude>90||longitude<-180||longitude>180){
            return res.status(400).json({
                success:false,
                code:"INVALID_COORDINATES",
                message:"The location coordinates are invalid."
            });
        }

        const response=await axios.get(
            "https://nominatim.openstreetmap.org/reverse",
            {
                params:{
                    format:"jsonv2",
                    lat:latitude,
                    lon:longitude,
                    zoom:18,
                    addressdetails:1
                },
                headers:{
                    "User-Agent":"SkillConnect/1.0"
                },
                timeout:10000
            }
        );

        const address=response.data?.address||{};

        console.log(
    "NOMINATIM ADDRESS:",
    JSON.stringify(response.data?.address,null,2)
);

        const country=address.country||"";
        const state=address.state||"";

        const city=
            address.city||
            address.town||
            address.municipality||
            address.village||
            address.suburb||
            "";

        const lga=
            address.county||
            address.municipality||
            "";

        if(!country||country.toLowerCase()!=="nigeria"){
            return res.status(400).json({
                success:false,
                code:"LOCATION_OUTSIDE_NIGERIA",
                message:"Please select a location within Nigeria."
            });
        }

        if(!state||!city||!lga){
            return res.status(404).json({
                success:false,
                code:"LOCATION_NOT_FOUND",
                message:"Unable to determine your LGA and city from your current location."
            });
        }

        return res.status(200).json({
            success:true,
            code:"LOCATION_FOUND",
            country:"Nigeria",
            state,
            city,
            lga,
            latitude,
            longitude
        });

    }catch(error){
        console.error(
            "Get location error:",
            error.response?.data||error.message
        );

        return res.status(500).json({
            success:false,
            code:"LOCATION_LOOKUP_FAILED",
            message:"Unable to determine your location. Please try again."
        });
    }
};


module.exports={
    getLocation
};