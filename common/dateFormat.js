const moment = require('moment');
function isValidSqlDateFormat(dateString) {
    // Check if the date string matches the YYYY-MM-DD format and Date is Valid Or not
    const format = 'YYYY-MM-DD';

    return moment(dateString, format, true).isValid();
}
// This Function for adding Date into Time String
function combineDateTime(dateString, timeString) {
    const fromDate = moment(dateString);
    const combinedDateTime = moment(`${fromDate.format('YYYY-MM-DD')} ${timeString}`, 'YYYY-MM-DD HH:mm');
    return combinedDateTime.format('YYYY-MM-DD HH:mm:ss');
}
  
module.exports = {
    isValidSqlDateFormat,combineDateTime
};