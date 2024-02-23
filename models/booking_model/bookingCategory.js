const {executeQuery} = require('../../db/connection')

class BookingCategory {
    constructor(categoryId , categoryName){
        this.categoryId = categoryId;
        this.categoryName = categoryName;
    }

    static async getBookingCatgeoryById(categoryId , connection){
        let sql = `
            select categoryName from bookingcategory where categoryId = ?; 
        `

        try{
            // const res = await executeQuery(sql , [categoryId]);
            const res = await connection.execute(sql , [categoryId]);
            return res;
        }catch(err){
            throw new Error('Error saving booking entry:', err);
        }
        
    }
}



module.exports = BookingCategory;