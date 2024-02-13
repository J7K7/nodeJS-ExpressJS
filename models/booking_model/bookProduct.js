const moment = require('moment-timezone');
const executeQuery = require('../../db/connection')

// Get the current time in Indian Standard Time (IST)
// const nowIST = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

class BookProduct {
    constructor(productId, quantity, slotId, bookingId, bookingDate, slotFromDateTime, slotToDateTime, price) {
        this.productId = productId;
        this.quantity = quantity;
        this.slotId = slotId;
        this.bookingId = bookingId;
        this.bookingDate = bookingDate;
        this.slotFromDateTime = slotFromDateTime;
        this.slotToDateTime = slotToDateTime;
        this.price = price;
    }

    async save(connection) {
        let sql = `
            INSERT INTO bookproduct (
                productId,
                quantity,
                slotId,
                bookingId,
                bookingDate,
                slotFromDateTime,
                slotToDateTime,
                price
            ) VALUES (
                '${this.productId}',
                '${this.quantity}',
                '${this.slotId}',
                '${this.bookingId}',
                '${this.bookingDate}',
                '${this.slotFromDateTime}',
                '${this.slotToDateTime}',
                '${this.price}'
            )
        `;


        try {
            // const res = await executeQuery(sql);
            const res = await connection.execute(sql);
            return res;
        } catch (err) {
            throw ('Error saving bookproduct entry:', err);
        }

    }
}

module.exports = BookProduct;