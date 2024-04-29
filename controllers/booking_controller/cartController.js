const { createPool } = require("../../db/connection");

const BookingsMaster = require("../../models/booking_model/bookingsMaster");
const BookProduct = require("../../models/booking_model/bookProduct");
const Slot = require("../../models/product_model/slot");
const moment = require("moment");

// Create the cart or update the existing one
// Add new product with default quantity 1 in teh cart
// Add same product multiple time to increase the quantity automatically
// Increase teh quanity of existing product in teh cart

// Process :
// For a particular user - one cart exist at a time - so check if teh cart exists - if not create a new one (userbooking_reation table)
// When creating teh cart for the first time - we generate a bookingId & set the status to added to cart(Bookingsmaster table)

// While adding products - we check if the product already exist - if yes - replace the existing one with some modified quanity - else add the product with default quantity 1 in the cart - (BOOKPRODUCT table)
// Fetch the slot data with the selected slotIds (Slotmaster table)
// update teh price according teh the quantity in the bookproduct & update teh grandTotal at last

// Reason for transaction in cart : when mtuliple users adds products to cart at the same tiemm  - without the idnividual connection Then all users add the product to same cart -- which is a problem
// Cart shoudl be independent for each user - hence maintaining the isolation of all with the transaction -----

const cartController = {
  addToCart: async (req, res) => {
    console.log("First");
    console.log(req.body);
    const userId = req.user.userId;

    // Start a transaction
    const connection = await createPool();
    await connection.beginTransaction();

    try {
      // Get userId from teh headers later
      let {
        bookingCategoryId,
        bookingFromDate,
        bookingToDate = null,
        productId,
      } = req.body;

      let quantity = req.body.quantity;
      // Will come from body (SLOT) & will find automatic (DAY)
      let slotIds;
      console.log("quanity is : ")
      console.log(req.body.quantity);
      console.log(typeof quantity);

      // Parsing the incoming data bcoz the www-urlencoded type of data gets passed as string in the body
      productId = parseInt(productId);
      // quantity = JSON.parse(quantity);

      if (!quantity) {
        return res
          .status(400)
          .json({ Status: false, msg: "Quantity is required" });
      }

      if (typeof quantity === "string") {
        quantity = JSON.parse(quantity); // Assuming it's a stringified array
      }

      if (!Array.isArray(quantity)) {
        quantity = [quantity]; // Convert to array if not already
      }



      // console.log("Second");
      // console.log(req.body);
      // console.log(quantity);
      // console.log(bookingCategoryId);
      // console.log(bookingCategoryId == 1);
      // console.log(bookingCategoryId == '1');
      // console.log(bookingCategoryId == '2');


      // if day -- multiple slotIds -- If slot -- one slot Id
      let slot = new Slot();

      if (bookingCategoryId == 1) {
        slotIds = req.body.slotIds;
        console.log(typeof slotIds);
        console.log("uper nivhe");

        console.log("typeof slotIds : ");
        console.log(slotIds);
        if (typeof slotIds == "String") {
          slotIds = JSON.parse(slotIds); // Assuming it's a stringified array
        }

        if (!Array.isArray(slotIds)) {
          console.log("insdide array");
          slotIds = [slotIds]; // Convert to array if not already
        }
        console.log("me idhar hu", slotIds);


        if (!slotIds || slotIds == "") {
          return res
            .status(400)
            .json({ Status: false, msg: "Select slot for this product" });
        }
      }

      if (!bookingCategoryId) {
        return res.status(400).json({
          Status: false,
          msg: "Could not retrieve booking category Id",
        });
      } else {
        if (!productId) {
          return res
            .status(400)
            .json({ Status: false, msg: "Select an appropriate product" });
        }

        if (quantity <= 0) {

          console.log("quantity is equal to zero ");
          // await this.removefromCart(bookingCategoryId, productId);
          try {
            // console.log("req.user.userId : " , req.user.userId);
            // console.log("req.user.userId : " , userId);
            let isRemovedFromCart;
            if (bookingCategoryId == 1) {
              // as of nwo -- add to cart supports adding mutliple slots of teh same product at one time 
              // bt remove from cart supports rmeoving only one slot at a time
              // So be carefull to pass only 1 slotId in teh array when you can want to remove teh product by decreasing the quantity 
              // Used when quantity becomes less tahn or equal to 0 -- at that time only one slot fo the product will be removed from teh cart 


              console.log("Slot ids : ");
              console.log(slotIds);
              console.log(slotIds[0])
              isRemovedFromCart = await cartController.removefromCart(bookingCategoryId, productId, slotIds[0] /**Passed only one slotId for teh safe side so that no error occurs  */, req.user.userId, connection);

              console.log("isRemovedFromCart")
              console.log(isRemovedFromCart);
              console.log("SLot id poichi aya sudhi ")
              console.log(slotIds);


            } else if (bookingCategoryId == 2) {
              isRemovedFromCart = await cartController.removefromCart(bookingCategoryId, productId, null, req.user.userId, connection);

              console.log("isRemovedFromCart")
              console.log(isRemovedFromCart);
            }

            connection.commit();

            return res.status(200).json({ Status: true, msg: isRemovedFromCart /**Sucecss message */ });
          } catch (err) {
            console.log(err)
            throw new Error(err);
          }

          // return res
          //   .status(400)
          //   .json({ Status: false, msg: "Quantity should be greater than 0" });
        }

        console.log("SLot id poichi aya sudhi ")
        console.log(slotIds);

        if (bookingCategoryId == 1) {
          // Validate slot data
          if (!bookingFromDate) {
            return res
              .status(400)
              .json({ Status: false, msg: "Booking Date is required" });
          }

          if (moment(bookingFromDate).isBefore(moment(), 'day')) {
            throw new Error("Booking Date should be greater than current Date.");
          }
        } else if (bookingCategoryId == 2) {
          // validate day data
          if (!bookingFromDate || !bookingToDate) {
            return res
              .status(400)
              .json({ Status: false, msg: "Booking Dates are required" });
          }

          if (bookingFromDate > bookingToDate) {
            return res.status(400).json({
              Status: false,
              msg: "From Date should be less than To Date.",
            });
          }

          // If currentBooking From time is less than tehcurrent date -- then user is not allowed to book that product 
          if (moment(bookingFromDate).isBefore(moment(), 'day')) {
            throw new Error("Booking From Date should be greater than current Date.");
          }
        } else {
          return res.status(400).json({
            Status: false,
            msg: "Could not retrieve a valid booking category Id",
          });
        }
      }

      // if day -- multiple slotIds -- If slot -- one slot Id
      // let slot = new Slot();
      console.log("SLot id poichi aya sudhi ")
      console.log(slotIds);
      // If slotIds is null in body-- which mean booking category is Day -- find slot Ids automatically
      if (bookingCategoryId == '1' /**Slot */) {
        // slotIds = req.body.slotIds;
        // console.log(typeof slotIds);
        // console.log("uper nivhe");

        // console.log("typeof slotIds : ");
        // console.log(slotIds);
        // if (typeof slotIds == "String") {
        //   slotIds = JSON.parse(slotIds); // Assuming it's a stringified array
        // }

        // if (!Array.isArray(slotIds)) {
        //   console.log("insdide array");
        //   slotIds = [slotIds]; // Convert to array if not already
        // }
        // slotIds = JSON.parse(slotIds);
        // console.log("me idhar hu", slotIds);


        // if (!slotIds || slotIds == "") {
        //   return res
        //     .status(400)
        //     .json({ Status: false, msg: "Select slot for this product" });
        // }


        // slotIds = JSON.parse(slotIds);

        for (let i = 0; i < slotIds.length; i++) {
          console.log("slotIds[i] : ", slotIds[i]);
          let { slotDate } = await Slot.getSlotById(slotIds[i]);
          slotDate = moment(slotDate).format("YYYY-MM-DD");
          bookingFromDate = moment(bookingFromDate).format("YYYY-MM-DD");
          console.log(slotDate);
          console.log(bookingFromDate);

          // console.log("SlotIDs : " , slotIds[i])
          if (slotDate != bookingFromDate) {
            return res.status(400).json({
              Status: false,
              msg: `Selected Slot (${slotIds[i]}) not available for this date.`,
            });
          }
        }
      } else if (bookingCategoryId == '2' /**Day */) {
        // Find SLot Ids based on booking from date & booking to date (Bcoz slots are of complete dayss)
        bookingFromDate = moment(bookingFromDate).format("YYYY-MM-DD");
        bookingToDate = moment(bookingToDate).format("YYYY-MM-DD");

        const numberofDays =
          moment(bookingToDate).diff(moment(bookingFromDate), "days") + 1;

        // Update teh quantity array of day slot - bcoz user selects only one quantity which is same for all the slotIds found -- hene make an arry of teh size numberOfDays with the same quantity
        const repeatedQuantity = [];

        for (let i = 0; i < numberofDays - 1; i++) {
          repeatedQuantity.push(quantity[0]);
        }

        quantity.push(...repeatedQuantity);

        // console.log(numberofDays);
        let slotIdsTemp = await slot.findSlotIds(
          connection,
          productId,
          bookingFromDate,
          bookingToDate
        );
        slotIds = slotIdsTemp.map((slot) => slot.slotId);
        // console.log(slotIds)
        // Some of the days may not be available between bookingFromDateTime & bookingToDateTime
        // Cases : a day between the fromDate & toDate can be deactivated by the admin - or deleted - or capacity full
        if (slotIds.length != numberofDays) {
          throw new Error("Booking not available between this dates.");
        }
      }
      console.log(slotIds)
      console.log(quantity.length)
      if (slotIds.length != quantity.length) {
        return res
          .status(400)
          .json({ Status: false, msg: "Select quantity for each product" });
      }

      if (slotIds.length == 0) {
        throw new Error("Slots Unavailable Or product Is Inactive!");
      }

      // Check if the slots selected is for that product only ----
      try {
        for (const slotId of slotIds) {
          let productIdFound = await Slot.findProductIdBySlotId(slotId);

          if (productIdFound != productId) {
            throw new Error(
              `Slot (${slotId}) does not belong to the product(${productId}) selected)`
            );
          }
        }
      } catch (err) {
        return res.status(400).json({ Status: false, msg: err.message });
      }

      // If cart exist : return current bookingId
      // else return null(indicating you need to generate the bookingId to add products to cart)
      let BookingMaster = new BookingsMaster();
      console.log("-------------------BEFORE CHECKING IF THE CART EXISTS---------------------")
      console.log(userId);
      // console.log(b);
      console.log("-------------------BEFORE CHECKING IF THE CART EXISTS---------------------")


      let currentBookingId = await BookingMaster.checkIfCartExists(
        userId,
        connection
      );

      console.log("-------------------AFTER CHECKING IF THE CART EXISTS---------------------")
      console.log(userId);
      console.log(currentBookingId);
      console.log("-------------------AFTER CHECKING IF THE CART EXISTS---------------------")
      // Date Format: YYYY-MM-DD
      // The day the product is booked : Date.now() : Will get updated with the date fo the latest product that is added to cart
      let currentBookingDate = moment().format("YYYY-MM-DD");
      let currentbooking_fromDatetime;
      let currentbooking_toDatetime;

      if (currentBookingId == null) {


        console.log("-------------CURRENT BOOKING ID NULL J CHE --------------")
        // Meaning -- cart does not exist -- bookingId does not exist -- hence create one
        const {
          bookingId,
          bookingDate,
          booking_fromDatetime,
          booking_toDatetime,
        } = await BookingMaster.createADefaultBookingMasterEntry(
          connection,
          userId,
          bookingFromDate,
          bookingToDate,
          slotIds,
          bookingCategoryId
        );



        currentBookingId = bookingId;
        currentBookingDate = bookingDate;
        currentbooking_fromDatetime = booking_fromDatetime;
        currentbooking_toDatetime = booking_toDatetime;

        console.log("---------- BOOKING DATA IN DB --------------------");
        console.log(bookingId);
        console.log(currentBookingDate);
        console.log(currentbooking_fromDatetime);
        console.log(currentbooking_toDatetime);
        // console.log("currentBookingId is null")
        // console.log("currentbooking_fromDatetime", currentbooking_fromDatetime)
        // console.log("currentbooking_toDatetime", currentbooking_toDatetime)
      } else {
        console.log("booking_fromDatetime", bookingFromDate);
        console.log("booking_toDatetime", bookingToDate);


        await BookingMaster.validateBookingDates(
          bookingCategoryId,
          bookingFromDate,
          currentBookingId,
          bookingFromDate,
          bookingToDate,
          connection
        );
      }
      ({ currentbooking_fromDatetime, currentbooking_toDatetime } =
        await BookingMaster.getBookingDates(currentBookingId, connection));

      currentbooking_fromDatetime = moment(currentbooking_fromDatetime).format(
        "YYYY-MM-DD HH:mm:ss"
      );
      currentbooking_toDatetime = moment(currentbooking_toDatetime).format(
        "YYYY-MM-DD HH:mm:ss"
      );

      // this dates are validated so taht next time the user adds another product it should match the criteria of existing dates
      // console.log("bookingFromDate", bookingFromDate)
      // console.log("currentbooking_fromDatetime" , currentbooking_fromDatetime)

      // await BookingMaster.validateBookingDates(
      //   bookingCategoryId,
      //   bookingFromDate,
      //   currentBookingId,
      //   currentbooking_fromDatetime,
      //   currentbooking_toDatetime,
      //   connection
      // );

      console.log("----- BOOKING DATES THAT THE USER ENTERS ------------------")
      console.log(bookingFromDate)
      console.log(bookingToDate)
      console.log("----- BOOKING DATES THAT THE USER ENTERS ------------------")




      // Cart is now created with some currentBookingId -- add products to cart

      const { updatedbooking_fromDatetime, updatedbooking_toDatetime } =
        await processSlotIds(
          slotIds,
          productId,
          quantity,
          currentBookingId,
          currentbooking_fromDatetime,
          currentbooking_toDatetime,
          connection
        );

      // Update grand total of the Cart & dates
      await BookingMaster.updateGrandTotalAndDates(
        connection,
        currentBookingId,
        updatedbooking_fromDatetime,
        updatedbooking_toDatetime
      );

      // Commit the transaction if everything is successful
      await connection.commit();

      return res
        .status(200)
        .json({ Status: true, msg: "Cart Updated Successfully" });
    } catch (err) {
      console.log(err)
      // Rollback the transaction in case of an error
      await connection.rollback();
      return res.status(400).json({
        Status: false,
        msg: "Error Adding Product to Cart. Try Again !",
        err: err.message,
      });
    } finally {
      // Release the connection
      connection.release();
    }
  },

  // This func is used only when the quantity present in teh cart is 1 -- if more quanity & you want to decrease the quantity from the cart - you can use the same add to cart function to update the quantity
  // if curr quantity of teh item to be removed from cart is 1 - delete the entry from bookproduct - bookingsmaster & userBooking_relation tables
  async removefromCart(bookingCategoryId, productId, slotId = null, userId, connection
  ) {
    // Start a transaction
    // const connection = await createPool();
    // await connection.beginTransaction();

    // const userId = req.user.userId;

    try {
      console.log("bookingCategoryId : ", bookingCategoryId)
      // const { productId, slotId } = req.body;
      if (bookingCategoryId == 1) {

        console.log("SlotId is : ")
        console.log(slotId)
        // Slot -- REQUIRED FIELDS TO REMOVE THE PRODUCT : PRODUCTID - SLOtID
        if (!productId || !slotId) {
          throw ("Product & slot is required");
        }

      } else if (bookingCategoryId == 2) {
        // Day -- REQUIRED FIELDS TO REMOVE THE PRODUCT : PRODUCTID 
        if (!productId) {
          throw ("Product required");
        }
      }

      let BookingMaster = new BookingsMaster();

      console.log("UserId", userId)
      let currentBookingId = await BookingMaster.checkIfCartExists(
        userId,
        connection
      );

      console.log("currentBookingId : ", currentBookingId);
      if (currentBookingId == null) {
        throw ("Cart is empty")
      }

      let BookProducts = new BookProduct();
      const { itemExists, currentQuantity } =
        await BookProducts.checkItemInCart(
          currentBookingId,
          productId,
          slotId,
          connection
        );

      console.log("itemExists", itemExists);
      console.log("currentQuantity", currentQuantity);



      if (!itemExists) {
        throw ("Item not found in the cart");
      }

      // Removes the product details from the book product
      const xyz = await BookProducts.removeCartItem(
        currentQuantity,
        connection,
        currentBookingId,
        productId,
        slotId
      );

      console.log("XYZ");
      console.log(xyz);

      console.log("removeCartItem DONE");

      // Delete the cart entry from bookingsmaster if all the items are removed from cart
      await BookingMaster.deleteCartEntryIfEmpty(currentBookingId, connection);

      // Commit the transaction if everything is successful
      // await connection.commit();

      return ("Item removed from cart Successfully");
    } catch (err) {
      console.log(err)
      // Rollback the transaction in case of an error
      // await connection.rollback();
      // return res.status(400).json({
      //   Status: false,
      //   msg: "Error Removing Item from Cart. Try Again!",
      //   err: err.message,
      // });

      throw ("Error Removing Item from Cart. Try Again!" + " " + err);
    }
  },

  // WHEN USER CLICKS ON DELETE ICON IN TEH CART 
  // THE COMPLETE PRODUCT IS DELETED - IRRESPECTIVE OF THE QUANTITY 
  removeProductFromCart: async (req, res) => {
    const userId = req.user.userId;
    const bookingCategoryId = req.body.bookingCategoryId;
    const productId = req.body.productId;
    var slotId = null;

    // Start a transaction
    const connection = await createPool();
    await connection.beginTransaction();


    try {
      console.log("bookingCategoryId : ", bookingCategoryId)
      if (!bookingCategoryId || !userId || !productId) {
        return res.status(400).json({ Status: false, msg: "All Fields are required" });
      }
      if (bookingCategoryId == 1) {
        slotId = req.body.slotId;
        // get teh slot id from the body 
        if (!slotId) {
          return res.status(400).json({ Status: false, msg: "SlotId is required." });
        }
      }
      try {
        await cartController.removefromCart(bookingCategoryId, productId, slotId, userId, connection);
      } catch (err) {
        throw (err);
      }

      // Commit the transaction if everything is successful
      await connection.commit();

      return res.status(200).json({ Status: true, msg: "Product Removed from cart successfully." })
    } catch (err) {
      console.log(err);
      // Rollback the transaction in case of an error
      await connection.rollback();

      return res.status(400).json({
        Status: false,
        msg: err,
      });
    }

  },

  // // View all items in the cart
  viewCart: async (req, res) => {
    const userId = req.user.userId;
    let businessCategoryId = req.query.businessCategoryId;

    // if(businessCategoryId != 1 || businessCategoryId != 2){
    //   return res.status(400).json({
    //     Status: false,
    //     msg: "Invalid Business Category Id.",
    //   });
    // }

    const BookingMaster = new BookingsMaster();
    try {
      let currentBookingId = await BookingMaster.checkIfCartExists(
        userId,
        null
      );

      // Check if the cart exists
      if (currentBookingId == null) {
        return res
          .status(200)
          .json({ Status: true, msg: "Cart is empty", items: [] });
      }

      // Fetch all items in the cart
      const cartItems = await BookingMaster.getCartItems(currentBookingId);

      if (businessCategoryId == '1') {
        cartItems.forEach((item) => {
          item.checkInDate = moment(item.checkInDate).format(
            "YYYY-MM-DD HH:mm:ss"
          );
          item.checkOutDate = moment(item.checkOutDate).format(
            "YYYY-MM-DD HH:mm:ss"
          );
          item.slotFromDateTime = moment(item.slotFromDateTime).format(
            "YYYY-MM-DD HH:mm:ss"
          );
          item.slotToDateTime = moment(item.slotToDateTime).format(
            "YYYY-MM-DD HH:mm:ss"
          );
        })

        return res.status(200).json({
          Status: true,
          msg: "Cart items retrieved successfully",
          items: cartItems,
        });
      } else if (businessCategoryId == '2') {
        const productInCart = {};
        // Organize cart items by bookingId
        cartItems.forEach(item => {
          const bookingId = item.bookingId;
          if (!productInCart[bookingId]) {
            productInCart[bookingId] = {
              bookingId: bookingId,
              checkInDate: moment(item.checkInDate).format("YYYY-MM-DD HH:mm:ss"),
              checkOutDate: moment(item.checkOutDate).format("YYYY-MM-DD HH:mm:ss"),
              grandTotal: item.grandTotal,
              products: []
            };
          }

          // Check if the product exists in the booking
          const productIndex = productInCart[bookingId].products.findIndex(prod => prod.productId === item.productId);
          if (productIndex === -1) {
            // Add the product to the booking
            productInCart[bookingId].products.push({
              productId: item.productId,
              productName: item.productName,
              productImage: item.productImage,
              quantity: item.quantity,
              slots: [{
                slotId: item.slotId,
                slotFromDateTime: moment(item.slotFromDateTime).format("YYYY-MM-DD HH:mm:ss"),
                slotToDateTime: moment(item.slotToDateTime).format("YYYY-MM-DD HH:mm:ss"),
                slotPrice: item.price
              }]
            });
          } else {
            // Add the slot to the existing product
            productInCart[bookingId].products[productIndex].slots.push({
              slotId: item.slotId,
              slotFromDateTime: moment(item.slotFromDateTime).format("YYYY-MM-DD HH:mm:ss"),
              slotToDateTime: moment(item.slotToDateTime).format("YYYY-MM-DD HH:mm:ss"),
              slotPrice: item.price
            });
          }
        });

        const itemsArray = Object.values(productInCart);

        return res.status(200).json({
          Status: true,
          msg: "Cart items retrieved successfully",
          totalProducts: itemsArray.length,
          items: itemsArray
        });
      }

      return res.status(400).json({
        Status: false,
        msg: "Unable to get Cart items",
      });
    } catch (err) {
      return res.status(400).json({
        Status: false,
        msg: "Error retrieving cart items. Try again!",
        err: err.message,
      });
    }
  },


  //   viewCart: async (req, res) => {
  //     const userId = req.user.userId;

  //     const BookingMaster = new BookingsMaster();
  //     try {
  //         let currentBookingId = await BookingMaster.checkIfCartExists(userId, null);

  //         // Check if the cart exists
  //         if (currentBookingId == null) {
  //             return res.status(200).json({ Status: true, msg: "Cart is empty", items: [] });
  //         }

  //         // Fetch all items in the cart
  //         const cartItems = await BookingMaster.getCartItems(currentBookingId);

  //         console.log("cartItems : ", cartItems)

  //         const productInCart = {};

  // // Organize cart items by bookingId
  // cartItems.forEach(item => {
  //     const bookingId = item.bookingId;
  //     if (!productInCart[bookingId]) {
  //       productInCart[bookingId] = {
  //             bookingId: bookingId,
  //             checkInDate: moment(item.checkInDate).format("YYYY-MM-DD HH:mm:ss"),
  //             checkOutDate: moment(item.checkOutDate).format("YYYY-MM-DD HH:mm:ss"),
  //             grandTotal : item.grandTotal,
  //             products: []
  //         };
  //     }

  //     // Check if the product exists in the booking
  //     const productIndex = productInCart[bookingId].products.findIndex(prod => prod.productId === item.productId);
  //     if (productIndex === -1) {
  //         // Add the product to the booking
  //         productInCart[bookingId].products.push({
  //             productId: item.productId,
  //             productName: item.productName,
  //             productImage: item.productImage,
  //             quantity: item.quantity,
  //             slots: [{
  //                 slotId: item.slotId,
  //                 slotFromDateTime: moment(item.slotFromDateTime).format("YYYY-MM-DD HH:mm:ss"),
  //                 slotToDateTime: moment(item.slotToDateTime).format("YYYY-MM-DD HH:mm:ss"),
  //                 price: item.price
  //             }]
  //         });
  //     } else {
  //         // Add the slot to the existing product
  //         productInCart[bookingId].products[productIndex].slots.push({
  //             slotId: item.slotId,
  //             slotFromDateTime: moment(item.slotFromDateTime).format("YYYY-MM-DD HH:mm:ss"),
  //             slotToDateTime: moment(item.slotToDateTime).format("YYYY-MM-DD HH:mm:ss"),
  //             price: item.price
  //         });
  //     }
  // });

  // const itemsArray = Object.values(productInCart);

  // return res.status(200).json({
  //     Status: true,
  //     msg: "Cart items retrieved successfully",
  //     totalProducts: itemsArray.length,
  //     items: itemsArray
  // });
  //     } catch (err) {
  //         return res.status(400).json({
  //             Status: false,
  //             msg: "Error retrieving cart items. Try again!",
  //             err: err.message
  //         });
  //     }
  // }
};

async function processSlotIds(
  slotIds,
  productId,
  quantity,
  currentBookingId,
  currentbooking_fromDatetime,
  currentbooking_toDatetime,
  connection
) {
  // Process slot IDs and update cart
  let updatedbooking_fromDatetime;
  let updatedbooking_toDatetime;

  await Promise.all(
    slotIds.map(async (slotId, i) => {
      ({ updatedbooking_fromDatetime, updatedbooking_toDatetime } =
        await processSlot(
          slotId,
          productId,
          quantity[i],
          currentBookingId,
          currentbooking_fromDatetime,
          currentbooking_toDatetime,
          connection
        ));
    })
  );

  return { updatedbooking_fromDatetime, updatedbooking_toDatetime };
}

async function processSlot(
  slotId,
  productId,
  quantity,
  currentBookingId,
  currentbooking_fromDatetime,
  currentbooking_toDatetime,
  connection
) {
  let BookProducts = new BookProduct();
  let BookingMaster = new BookingsMaster();

  // Process individual slot and update cart
  const slotDetails = await validateSlot(slotId, quantity, connection);

  // Update the dates of the slot if needed in bookingsmaster
  let { updatedbooking_fromDatetime, updatedbooking_toDatetime } =
    await BookingMaster.updateBookingDates(
      slotDetails,
      currentBookingId,
      currentbooking_fromDatetime,
      currentbooking_toDatetime,
      connection
    );

  const existingProductDetails = await BookProducts.getExistingProductDetails(
    currentBookingId,
    productId,
    slotId,
    connection
  );

  if (existingProductDetails[0].length != 0) {
    await BookProducts.updateProductQuantity(
      quantity,
      slotId,
      productId,
      currentBookingId,
      connection
    );
  } else {
    let BookProducts = new BookProduct();
    await BookProducts.createBookingProductEntry(
      connection,
      productId,
      quantity,
      slotId,
      currentBookingId,
      slotDetails.slotFromDateTime
    );
  }

  return { updatedbooking_fromDatetime, updatedbooking_toDatetime };
}

async function validateSlot(slotId, quantity, connection) {
  // Validate slot details
  quantity = parseInt(quantity);

  const slotDetails = await Slot.getSlotById(slotId, connection);

  if (!slotDetails.slotActive) {
    throw new Error(`Slot with id ${slotId} is inactive!`);
  }

  if (slotDetails.slotBooked + quantity > slotDetails.slotOriginalCapacity) {
    throw new Error(
      `Available slots: ${slotDetails.slotOriginalCapacity - slotDetails.slotBooked}
      `
    );
  }
  return slotDetails;
}

module.exports = cartController;
