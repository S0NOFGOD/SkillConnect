/* =========================================================
   SKILLCONNECT LOCATION CONTROLLER
========================================================= */

const axios=require("axios");


/* =========================================================
   CACHE
========================================================= */

const locationCache=new Map();

const CACHE_TTL=24*60*60*1000;

const getCacheKey=(latitude,longitude)=>{
    return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
};


/* =========================================================
   RATE LIMITING
========================================================= */

const rateLimitMap=new Map();

const RATE_LIMIT_WINDOW=60*1000;
const MAX_REQUESTS_PER_WINDOW=5;

const isRateLimited=(ip)=>{
    const now=Date.now();
    const record=rateLimitMap.get(ip);

    if(!record||now-record.start>=RATE_LIMIT_WINDOW){
        rateLimitMap.set(ip,{
            start:now,
            count:1
        });

        return false;
    }

    record.count++;

    return record.count>MAX_REQUESTS_PER_WINDOW;
};


/* =========================================================
   CLEAN OLD CACHE/RATE-LIMIT DATA
========================================================= */

setInterval(()=>{
    const now=Date.now();

    for(const [key,value] of locationCache){
        if(now-value.expiresAt){
            locationCache.delete(key);
        }
    }

    for(const [ip,value] of rateLimitMap){
        if(now-value.start>=RATE_LIMIT_WINDOW){
            rateLimitMap.delete(ip);
        }
    }
},10*60*1000);


/* =========================================================
   GET LOCATION
========================================================= */

const getLocation=async(req,res)=>{
    try{

        /* =====================================================
           RATE LIMIT
        ===================================================== */

        const ip=req.ip||req.socket.remoteAddress||"unknown";

        if(isRateLimited(ip)){
            return res.status(429).json({
                success:false,
                code:"LOCATION_RATE_LIMITED",
                message:"Too many location requests. Please wait a moment and try again."
            });
        }


        /* =====================================================
           VALIDATE COORDINATES
        ===================================================== */

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


        /* =====================================================
           CHECK CACHE
        ===================================================== */

        const cacheKey=getCacheKey(latitude,longitude);
        const cached=locationCache.get(cacheKey);

        if(cached&&Date.now()<cached.expiresAt){
            console.log("LOCATION CACHE HIT:",cacheKey);

            return res.status(200).json({
                ...cached.data,
                latitude,
                longitude
            });
        }


        /* =====================================================
           NOMINATIM REQUEST
        ===================================================== */

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
                    "User-Agent":"SkillConnect/1.0 (SkillConnect location service)"
                },
                timeout:10000
            }
        );


        /* =====================================================
           EXTRACT ADDRESS
        ===================================================== */

        const address=response.data?.address||{};

        console.log(
            "NOMINATIM ADDRESS:",
            JSON.stringify(address,null,2)
        );

        const country=address.country||"";
        const state=address.state||"";

        // Use the detected state as the city.
        const city=state;

        const lga=
            address.county||
            address.municipality||
            "";


        /* =====================================================
           CHECK NIGERIA
        ===================================================== */

        if(!country||country.toLowerCase()!=="nigeria"){
            return res.status(400).json({
                success:false,
                code:"LOCATION_OUTSIDE_NIGERIA",
                message:"Please select a location within Nigeria."
            });
        }


        /* =====================================================
           CHECK LOCATION DATA
        ===================================================== */

        if(!state||!city||!lga){
            return res.status(404).json({
                success:false,
                code:"LOCATION_NOT_FOUND",
                message:"Unable to determine your LGA and city from your current location."
            });
        }


        /* =====================================================
           LOCATION RESULT
        ===================================================== */

        const locationData={
            success:true,
            code:"LOCATION_FOUND",
            country:"Nigeria",
            state,
            city,
            lga
        };


        /* =====================================================
           SAVE TO CACHE
        ===================================================== */

        locationCache.set(cacheKey,{
            data:locationData,
            expiresAt:Date.now()+CACHE_TTL
        });


        /* =====================================================
           RESPONSE
        ===================================================== */

        return res.status(200).json({
            ...locationData,
            latitude,
            longitude
        });

    }catch(error){

        /* =====================================================
           NOMINATIM RATE LIMIT
        ===================================================== */

        if(error.response?.status===429){

            const retryAfter=
                Number(error.response.headers?.["retry-after"])||60;

            console.error(
                "Nominatim rate limit reached. Retry after:",
                retryAfter,
                "seconds"
            );

            return res.status(429).json({
                success:false,
                code:"GEOCODER_RATE_LIMITED",
                message:"The location service is temporarily busy. Please wait and try again.",
                retryAfter
            });
        }


        /* =====================================================
           OTHER ERRORS
        ===================================================== */

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