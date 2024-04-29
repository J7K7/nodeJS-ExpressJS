const { executeQuery } = require("../../db/connection");

class Order {
    constructor(bookingId, bookingDate, booking_fromDatetime, booking_toDatetime, status, grandTotal, timestamp, user) {
        this.bookingId = bookingId;
        this.bookingDate = bookingDate;
        this.booking_fromDatetime = booking_fromDatetime;
        this.booking_toDatetime = booking_toDatetime;
        this.status = status;
        this.grandTotal = grandTotal;
        this.timestamp = timestamp;
        this.user = user;
        this.products = [];
    }

    addProduct(productId, productName, productImageId, productImagePath, quantity) {
        this.products.push({ productId, productName, productImageId, productImagePath, quantity, slots: [] });
    }

    addSlot(productId, slotId, slotFromDateTime, slotToDateTime, price) {
        const product = this.products.find(product => product.productId === productId);
        // Check if the slotId already exists, if not add the slot
        if (!product.slots.some(slot => slot.slotId === slotId)) {
            product.slots.push({ slotId, slotFromDateTime, slotToDateTime, price });
        }
    }

    static async getAllOrders() {
        let sql = `
            SELECT b.bookingId, b.bookingDate, b.booking_fromDatetime, b.booking_toDatetime, b.statusId , b.grandTotal,b.timestamp,
                p.productId, p.quantity, s.slotId, s.slotFromDateTime, s.slotToDateTime, s.price,
                pm.productName , ip.imageId
            FROM bookingsmaster b
            JOIN bookProduct p ON b.bookingId = p.bookingId
            JOIN productmaster pm ON p.productId = pm.productId
            LEFT JOIN productimage_relation ip ON pm.productId = ip.productId
            LEFT JOIN bookproduct s ON p.productId = s.productId AND p.bookingId = s.bookingId;
        `;

        try {
            const res = await executeQuery(sql);
            return res;
        } catch (err) {
            throw ('Error executing getAllOrders query:', err);
        }
    }

    static async getAllOrdersOfUser(userId, statusId = null) {
        let sql;

        if (statusId === 0) {
            sql = `
                SELECT 
                    b.bookingId, 
                    b.bookingDate, 
                    b.booking_fromDatetime, 
                    b.booking_toDatetime, 
                    b.statusId, 
                    b.grandTotal,
                    p.productId, 
                    p.quantity, 
                    s.slotId, 
                    s.slotFromDateTime, 
                    s.slotToDateTime, 
                    s.price,
                    pm.productName, 
                    ip.imageId,
                    pi.imagePath as productImagePath,
                    um.email,
                    um.firstName,
                    um.lastName,
                    um.phoneNumber
                FROM 
                    bookingsmaster b
                JOIN 
                    bookProduct p ON b.bookingId = p.bookingId
                JOIN 
                    productmaster pm ON p.productId = pm.productId
                LEFT JOIN 
                    productimage_relation ip ON pm.productId = ip.productId
                LEFT JOIN productimages as pi ON pi.imageId = ip.imageId
                LEFT JOIN 
                    bookproduct s ON p.productId = s.productId AND p.bookingId = s.bookingId
                JOIN 
                    userbooking_relation u ON b.bookingId = u.bookingId
                JOIN 
                    usermaster as um ON um.userId = u.userId
                WHERE 
                    u.userId = ? AND b.statusId <> 1
                ORDER BY 
                    b.bookingDate DESC;
            `;

            try {
                const res = await executeQuery(sql, [userId]);
                return res;
            } catch (err) {
                throw ('Error executing getAllOrdersOfUser query:', err);
            }
        } else {
            sql = `
                SELECT 
                    b.bookingId, 
                    b.bookingDate, 
                    b.booking_fromDatetime, 
                    b.booking_toDatetime, 
                    b.statusId, 
                    b.grandTotal, 
                    b.timestamp,
                    p.productId, 
                    p.quantity, 
                    s.slotId, 
                    s.slotFromDateTime, 
                    s.slotToDateTime, 
                    s.price,
                    pm.productName, 
                    ip.imageId,
                    pi.imagePath as productImagePath,
                    um.email,
                    um.firstName,
                    um.lastName,
                    um.phoneNumber
                FROM 
                    bookingsmaster b
                JOIN 
                    bookProduct p ON b.bookingId = p.bookingId
                JOIN 
                    productmaster pm ON p.productId = pm.productId
                LEFT JOIN 
                    productimage_relation ip ON pm.productId = ip.productId
                LEFT JOIN productimages as pi ON pi.imageId = ip.imageId
                LEFT JOIN 
                    bookproduct s ON p.productId = s.productId AND p.bookingId = s.bookingId
                JOIN 
                    userbooking_relation u ON b.bookingId = u.bookingId
                JOIN 
                    usermaster as um ON um.userId = u.userId
                WHERE 
                    u.userId = ? AND b.statusId = ?  
                ORDER BY 
                    b.timestamp DESC;
            `;

            try {
                const res = await executeQuery(sql, [userId, statusId]);
                return res;
            } catch (err) {
                throw ('Error executing getAllOrdersOfUser query:', err);
            }
        }
    }

}

module.exports = Order;