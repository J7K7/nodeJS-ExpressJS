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

    // addSlot(productId, slotId, slotFromDateTime, slotToDateTime, price) {
    //     const product = this.products.find(product => product.productId === productId);
    //     // Check if the slotId already exists, if not add the slot
    //     if (!product.slots.some(slot => slot.slotId === slotId)) {
    //         product.slots.push({ slotId, slotFromDateTime, slotToDateTime, price });
    //     }
    // }

    
    addSlot(productId, slotId, slotFromDateTime, slotToDateTime, price , quantity = null) {

        const product = this.products.find(product => product.productId === productId);
        // Check if the slotId already exists, if not add the slot
        if (!product.slots.some(slot => slot.slotId === slotId)) {
           if(quantity != null){
            product.slots.push({ slotId, slotFromDateTime, slotToDateTime, price , quantity});
            // console.log("SLOTS ADDED ARE navu navu: ");
            // console.log(product.slots)
           }else {
            // console.log("else ma aivu")
            product.slots.push({ slotId, slotFromDateTime, slotToDateTime, price });
           }
        }
    }

    static async getAllOrders() {
        let sql = `
            SELECT b.bookingId, b.bookingDate, b.booking_fromDatetime, b.booking_toDatetime, b.statusId , b.grandTotal,b.timestamp,
                p.productId, s.quantity, s.slotId, s.slotFromDateTime, s.slotToDateTime, s.price,
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

    static async getAllOrdersWithFilter(filters) {
        // let sql = `
        //     SELECT b.bookingId, b.bookingDate, b.booking_fromDatetime, b.booking_toDatetime, b.statusId , b.grandTotal,b.timestamp,
        //         p.productId, s.quantity, s.slotId, s.slotFromDateTime, s.slotToDateTime, s.price,
        //         pm.productName , ip.imageId
        //     FROM bookingsmaster b
        //     JOIN bookProduct p ON b.bookingId = p.bookingId
        //     JOIN productmaster pm ON p.productId = pm.productId
        //     LEFT JOIN productimage_relation ip ON pm.productId = ip.productId
        //     LEFT JOIN bookproduct s ON p.productId = s.productId AND p.bookingId = s.bookingId;
        // `;

        let sql = `SELECT bm.bookingId,  bm.bookingDate, bm.statusId, bm.grandTotal, bm.timestamp, GROUP_CONCAT(pcr.productCategoryId) AS productcategoryIds
                   FROM bookingsmaster AS bm
                   JOIN bookproduct AS bp ON bp.bookingId = bm.bookingId
                   JOIN productcategory_product_relation AS pcr ON bp.productId = pcr.productId
                   where '1'='1'`

        try {
            console.log(filters);
            let queryParam = [];
            if (filters.fromDate && filters.toDate) {
                sql += ` AND bm.bookingDate between ? AND ?`;
                queryParam.push(filters.fromDate);
                queryParam.push(filters.toDate);
            }
              if (filters.statusId) {
                sql += ` AND bm.statusId = ?`;
                queryParam.push(filters.statusId)
              }
            
              if (filters.productCategoryId) {
                sql += ` AND FIND_IN_SET(?, pcr.productCategoryId) > 0`;
                queryParam.push(filters.productCategoryId)
              }

              sql += ` GROUP BY bm.bookingId`
              let pageQuery = `select count(bookingId) as totalResults from (${sql}) AS tab`
              console.log("sql:",pageQuery);
              const pageRes = await executeQuery(pageQuery, queryParam);
            //   console.log("total pages: ", pageRes);
            
              sql += ` LIMIT ?, ?`;
              queryParam.push(filters.offset);
              queryParam.push(filters.limit);

            
            const res = await executeQuery(sql,queryParam);
            return {
                data: res,
                totalResults: pageRes[0].totalResults
            }
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
                    s.quantity, 
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
                    s.quantity,
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