const {executeQuery} = require('../../db/connection')

class BookingStatuses {

    constructor(statusName) {
        this.statusName = statusName;
    }

    async save() {

        try{
            // Check if the status already exists
            const statusExists = await this.checkStatus(this.statusName);
    
            if (statusExists[0].count === 0){
                let sql = `
                    INSERT INTO booking_statuses(
                        statusName
                    ) VALUES (
                        '${this.statusName}'
                    )
                `;
                return await executeQuery(sql);
            }
        }catch(err){
            throw new Error("Error executing the save statsu query " , err)
        }

    }

    async checkStatus(statusName) {
        let sql = `
            SELECT COUNT(*) as count FROM booking_statuses WHERE statusName='${statusName}'
        `;

        return await executeQuery(sql);
    }

    static async findAll() {
        let sql = 'SELECT statusId, statusName FROM booking_statuses'

        return executeQuery(sql);
    }

    static async getCurrentBookingStatus(bookingId) {
        let sql = `
            SELECT s.statusName 
            FROM booking_statuses as s
            JOIN bookingsmaster as b 
            ON s.statusId = b.statusId
            WHERE b.bookingId = ${bookingId};
        `
        return await executeQuery(sql);
    }

    static async findAddedToCartStatusId(connection){
        let sql = `
            select statusId from booking_statuses where statusName = 'Added To Cart';
        `
        try{
            // const res = await executeQuery(sql);
            const res = await connection.execute(sql);
            return res;
        }catch(err){
            throw new Error('Error executing findAddedToCartStatusId query:', err);
        }
    }

}

module.exports = BookingStatuses;