function isValidSqlDateFormat(dateString) {
    // Check if the date string matches the YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dateRegex.test(dateString);
}
  
module.exports = {
    isValidSqlDateFormat,
};