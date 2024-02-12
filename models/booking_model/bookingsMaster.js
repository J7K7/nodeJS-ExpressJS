const moment = require('moment-timezone');
const {executeQuery} = require('../../db/connection')

// Get the current time in Indian Standard Time (IST)
const nowIST = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

class BookingsMaster {
    constructor(bookingDate, booking_fromDatetime, booking_toDatetime, status, grandTotal) {
        this.bookingDate = bookingDate;
        this.booking_fromDatetime = booking_fromDatetime;
        this.booking_toDatetime = booking_toDatetime;
        this.status = status;
        this.grandTotal = grandTotal;
    }

    async save() {

        let sql = `
            INSERT INTO bookingsmaster (
                bookingDate,
                booking_fromDatetime,
                booking_toDatetime,
                status,
                grandTotal
            ) VALUES (
                '${this.bookingDate}',
                '${this.booking_fromDatetime}',
                '${this.booking_toDatetime}',
                '${this.status}',
                '${this.grandTotal}'
            )
        `;

        // console.log("Connection is : " , connection)
        
        try{
            const res = await executeQuery(sql);
            // const res = await connection.execute(sql);
            return res;
        }catch(err){
            throw('Error saving booking entry:', err);
        }
    }

    static async checkBookingId(bookingId){
        let sql = `
            SELECT COUNT(*) as count FROM bookingsmaster WHERE bookingId = ${bookingId};
        `;

        return await executeQuery(sql);
    }

    // From Here all updates written by JIM Patel

    
}

module.exports = BookingsMaster;