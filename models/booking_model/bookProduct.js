const moment = require("moment");
const { executeQuery } = require("../../db/connection");

class BookProduct {
  constructor(
    productId,
    quantity,
    slotId,
    bookingId,
    bookingDate,
    slotFromDateTime,
    slotToDateTime,
    price
  ) {
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
      throw new Error("Error saving bookproduct entry:", err);
    }
  }

  static async checkIfSlotIdsIsStillAvailableForBooking(connection, bookingId) {
    let sql = `
            SELECT 1
            FROM bookproduct
            WHERE bookingId = ? AND slotId IS NULL;
        `;

    try {
      // const res = await executeQuery(sql);
      const res = await connection.execute(sql, [bookingId]);
      return res;
    } catch (err) {
      throw new Error("Error validating the slots:", err);
    }
  }

  async checkItemInCart(currentBookingId, productId, slotId, connection) {
    const checkItemQuery = `
            SELECT quantity FROM bookproduct
            WHERE bookingId = ? AND productId = ? AND slotId = ?;
        `;
    const [result] = await connection.execute(checkItemQuery, [
      currentBookingId,
      productId,
      slotId,
    ]);

    if (result.length == 0) return { itemExists: false };
    return {
      itemExists: result.length > 0,
      currentQuantity: result[0].quantity,
    };
  }

  async createBookingProductEntry(
    connection,
    productId,
    quantity,
    slotId,
    currentBookingId,
    currentBookingDate
  ) {
    currentBookingDate = moment(currentBookingDate).format("YYYY-MM-DD");

    try {
      // if does not exist -- create one --
      let getSlotData = `
                    SELECT slotFromDateTime, slotToDateTime, slotBooked, slotPrice, slotActive, slotOriginalCapacity
                    FROM slotmaster
                    WHERE slotId = ?
                `;

      const slotData = await connection.execute(getSlotData, [slotId]);

      let { slotActive } = slotData[0][0];

      if (!slotActive) {
        throw new Error("Slot Unavailable");
      }

      let { slotFromDateTime, slotToDateTime, slotPrice } = slotData[0][0];

      slotFromDateTime = moment(slotFromDateTime).format("YYYY-MM-DD HH:mm:ss");
      slotToDateTime = moment(slotToDateTime).format("YYYY-MM-DD HH:mm:ss");

      // // Set status of individual producst in book product table -- this status will be same as bookingsmaster status - as of now --- it will change only when one product or slot needs to be deleted

      // let fetchCurrStatusFromBookingsMaster = await connection.execute(`
      //     select status from bookingsmaster where bookingId = ?
      // ` , [currentBookingId])

      // console.log("fetchCurrStatusFromBookingsMaster" , fetchCurrStatusFromBookingsMaster)

      // Validating that this slot and product related or not.
      const slotProductRelationVerifyQuery = `SELECT 1
            FROM slotproduct_relation
            WHERE productId = ? 
            AND slotId = ?`;
      const [slotProductRelation] = await connection.execute(
        slotProductRelationVerifyQuery,
        [productId, slotId]
      );

      if (slotProductRelation.length == 0) {
        throw new Error("Particular slot is not for this Product");
      }
      const bookProductEntry = new BookProduct(
        productId,
        quantity,
        slotId,
        currentBookingId,
        currentBookingDate,
        slotFromDateTime,
        slotToDateTime,
        slotPrice
      );

      // console.log("bookProductEntry : ", bookProductEntry);

      const productselectedforbooking = await bookProductEntry.save(connection);

      // console.log(productselectedforbooking);

      return;
    } catch (err) {
      throw new Error("Error saving the product details: " + err.message);
    }
  }

  async updateProductQuantity(
    quantityBooked,
    slotId,
    productId,
    currentBookingId,
    connection
  ) {
    // Update quantity of existing product in the cart
    const sql = `UPDATE bookproduct SET quantity = ? WHERE productId = ? AND slotId = ? AND bookingId = ?`;
    await connection.execute(sql, [
      quantityBooked,
      productId,
      slotId,
      currentBookingId,
    ]);
  }

  async getExistingProductDetails(
    currentBookingId,
    productId,
    slotId,
    connection
  ) {
    // Get existing product details in the cart
    const sql = `SELECT productId, quantity, slotId, price FROM bookproduct WHERE bookingId = ? AND productId = ? AND slotId = ?`;
    return await connection.execute(sql, [currentBookingId, productId, slotId]);
  }

  async removeCartItem(
    currentQuantity,
    connection,
    currentBookingId,
    productId,
    slotId
  ) {
    let result = null;
    if (currentQuantity <= 1) {
      // If quantity is 1, remove the item from the cart
      const deleteItemQuery = `
                DELETE FROM bookproduct
                WHERE bookingId = ? AND productId = ? AND slotId = ?;
            `;
      result = await connection.execute(deleteItemQuery, [
        currentBookingId,
        productId,
        slotId,
      ]);
    }

    // else if(currentQuantity>1) {
    //     // If quantity is greater than 1, decrease the quantity
    //     const updateQuantityQuery = `
    //         UPDATE bookproduct
    //         SET quantity = quantity - 1,
    //         price = (SELECT slotPrice FROM slotmaster WHERE slotId = ?) * (quantity)
    //         WHERE bookingId = ? AND productId = ? AND slotId = ?;
    //     `;
    //     result=await connection.execute(updateQuantityQuery, [slotId, currentBookingId, productId, slotId]);
    // }
    // console.log(result);
  }

  //Jim Patel's Part

  // This function, 'updateSlotIdToNull' is an asynchronous function that takes a single argument, 'slotId'.
  // Its purpose is to update the 'slotId' column to null in the 'bookProduct' table So we can delete the slotId from the Slot master.
  // This operation effectively "deletes" the slotId from the 'bookProduct' table, while preserving the data associated with it.

  static async updateSlotIdToNull(slotId) {
    try {
      const query = "UPDATE bookProduct SET slotId = NULL WHERE slotId = ?";
      await executeQuery(query, [slotId]);
    } catch (error) {
      // Handle any errors that occur during the database operation
      throw new Error(`Error updating slotId to NULL: ${error.message}`);
    }
  }
}

module.exports = BookProduct;
