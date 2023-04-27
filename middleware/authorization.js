const originsArray = process.env.ORIGIN_ARRAY.split(" ");

const verifyReferer = (req, res, next) => {
    const referer = req.headers.referer || req.headers.referrer;

    if (!referer || !originsArray.includes(allowedReferer)) {
        return res.status(403).send({ isError: true, result: 'Cors Origin Validation Failed.'});
    }

    next();
}

const verifyOrigin = (req, res, next) => {
    const { origin } = req.headers;
    if(originsArray.includes(origin)){
        res.setHeader('Access-Control-Allow-Origin', origin);

    }else{
        return res.status(403).send({
            isError: true,
            result: 'Cors Origin Validation Failed.'
        });
    }
    next();
}

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization;
  
    if (!token) {
        return res.status(403).send({ isError: true, result: 'Cors Origin Validation Failed.' });
    }
  
    try {
      if(token === process.env.REACT_APP_API_TOKEN){
        next();
      }else{
        return res.status(403).send({ isError: true, result: 'Cors Origin Validation Failed.' });
      }
    } catch (error) {
        return res.status(403).send({ isError: true, result: 'Cors Origin Validation Failed.' });
    }
}
  
exports.verifyToken = verifyToken;
exports.verifyOrigin = verifyOrigin;
exports.verifyReferer = verifyReferer;
exports.originsArray = originsArray;