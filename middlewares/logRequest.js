// logger.js

const { executeQuery } = require("../db/connection");

function logRequest(req, res, next) {
    // console.log("Req=",req)
    const logEntry = {
        userId: null, // Assuming you have user authentication middleware
        method: req.method,
        url: req.url,
        body: '',
        req_IPAddress: req.ip,
        res_statusCode: '',
        res_body: '', // We'll capture this after response is sent
    };

    let responseData = ''
    const originalSend = res.send;
    res.send = function (data) {
        responseData = data;
        originalSend.apply(res, arguments);
    };

    res.on('finish', async () => {
        // console.log("This is request",req.body);
        logEntry.body=JSON.stringify(req.body);
        logEntry.userId  = req.user ? req.user.userId :  null;
        responseData = JSON.parse(responseData);
        console.log(responseData);
        const logResponse={
            msg:responseData.msg || null,
            Status:responseData.Status || null,
            error:responseData.error || null
        }
        // console.log(logResponse)


        logEntry.res_body = JSON.stringify(logResponse);
        logEntry.res_statusCode = res.statusCode

        // Inserting logEntry into the database
        const query = 'INSERT INTO request_logs (userId, req_method, req_url,req_body , req_IPAddress, res_statusCode, res_body) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const values = [
            logEntry.userId,
            logEntry.method,
            logEntry.url,
            logEntry.body,
            logEntry.req_IPAddress,
            logEntry.res_statusCode,
            logEntry.res_body
        ];

        await executeQuery(query, values)
    });

    next();
}

module.exports = logRequest;
