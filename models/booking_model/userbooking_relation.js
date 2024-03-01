const {executeQuery} = require('../../db/connection')

class UserBookingRelation {
    constructor(userId, bookingId) {
        this.userId = userId;
        this.bookingId = bookingId;
    }

    async save(connection){
        let sql = `
            insert into userbooking_relation (userId , bookingId) values (?,?)`
        try{
            // const res = await executeQuery(sql);
            const res = await connection.execute(sql, [this.userId, this.bookingId]);
            return res;
        }catch(err){
            throw new Error('Error executing UserBookingRelation saving query:', err);
        }
    }

    static async getBookingIdsbyuserId(userId){
        let sql = `
            select bookingId from userbooking_relation where userId = ?
        `

        try{
            const res = await executeQuery(sql , [userId]);
            return res;
        }catch(err){
            throw new Error('Error executing getBookingIdsbyuserId query:', err);
        }
    } 
}

module.exports = UserBookingRelation;