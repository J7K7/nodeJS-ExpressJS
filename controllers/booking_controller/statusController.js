const BookingStatuses = require('../../models/booking_model/bookingStatuses')
const BookingsMaster = require('../../models/booking_model/bookingsMaster')

exports.getAllStatus = async (req, res) => {
    try {
        const result = await BookingStatuses.findAll();

        res.status(200).json({
            Status: true,
            message: 'Booking Status displayed successfully',
            data: result,
        });
    } catch (err) {
        res.status(400).json({
            Status: false,
            message: 'Cannot retrieve Booking Statuses',
            error: err,
        });
    }
};

exports.getCurrentBookingStatus = async (req, res) => {
    const { bookingId } = req.params;

    try {

        // Check if the bookingId exists in bookingsmaster
        const checkResult = await BookingsMaster.checkBookingId(bookingId);

        if (checkResult[0].count == 0) {
            return res.status(404).json({
                Status: false,
                message: 'Booking does not exist',
                data: null,
            });
        }

        const result = await BookingStatuses.getCurrentBookingStatus(bookingId);

        res.status(200).json({
            Status: true,
            message: 'Current Booking Status displayed successfully',
            data: result,
        });

    } catch (err) {
        res.status(400).json({
            Status: false,
            message: 'Cannot retrieve Current Booking Statuses',
            error: err,
        });
    }
}

// Statuses remain fixed throughtout teh application 
// It will insert 7 fixed statuses first - when teh application starts & it cannot be modified
exports.addStatus = async (req, res) => {

    try {

        const statuses = ['Added to Cart', 'Pending', 'Confirmed', 'Completed', 'Cancelled', 'Cancelled by Admin', 'Partially Cancelled']

        // Creating the instance for each of teh statuses 

        for (const statusName of statuses) {
            const bookingStatus = new BookingStatuses(statusName);

            // Insert the new status
            await bookingStatus.save();
        }

        return { Status: true, message: 'Booking Statuses added successfully' };
    } catch (err) {
        return { Status: false, message: 'Error Adding the booking Status.', err : err.message };
    }
}