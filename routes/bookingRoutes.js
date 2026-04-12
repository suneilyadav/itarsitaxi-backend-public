// routes/bookingRoutes.js
const express = require("express");
const router = express.Router();
const getDistance = require("../utils/getDistance");
const Booking = require("../models/Booking");
const { sendBookingWhatsAppAlerts } = require("../utils/sendWhatsApp");

const ITARSI_LOCATION = "Itarsi, Madhya Pradesh";

router.get("/distance", async (req, res) => {
  const { origin, destination } = req.query;
  if (!origin || !destination) {
    return res.status(400).json({ error: "Both origin and destination are required." });
  }

  try {
    const result = await getDistance(origin, destination);
    res.json(result);
  } catch (err) {
    console.error("❌ Error in distance API:", err.message);
    res.status(500).json({ error: "Failed to fetch distance." });
  }
});

router.post("/", async (req, res) => {
  try {
    console.log("📥 Incoming booking request body:\n", JSON.stringify(req.body, null, 2));

    const {
      name,
      mobile,
      email = "",
      paymentMode,
      carType,
      distance,
      totalFare,
      tollCount = 0,
      pickupDate,
      pickupTime,
      tripType,
      pickupLocation,
      dropLocation,
      duration = "",
      whatsappOptIn = true,
    } = req.body;

    const requestedDistance = Number(distance) || 0;

    // Mandatory field check
const missingFields = [];
if (!name) missingFields.push("name");
if (!mobile) missingFields.push("mobile");
if (!paymentMode) missingFields.push("paymentMode");
if (!carType) missingFields.push("carType");
if (distance === undefined || distance === null) missingFields.push("distance");
if (totalFare === undefined || totalFare === null) missingFields.push("totalFare");
if (!tripType) missingFields.push("tripType");
if (!pickupLocation) missingFields.push("pickupLocation");
if (!dropLocation) missingFields.push("dropLocation");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        missingFields,
      });
    }

    if (paymentMode !== "Cash on Arrival") {
      return res.status(400).json({ success: false, message: "Invalid route for prepaid bookings" });
    }

    if (tripType === "Airport" && !dropLocation.toLowerCase().includes("airport")) {
      return res.status(400).json({
        success: false,
        message: "Drop location must be a valid airport for Airport trip type.",
      });
    }

    try {
      const { distanceInKm: pickupDistanceFromItarsi } = await getDistance(ITARSI_LOCATION, pickupLocation);
      const { distanceInKm: dropDistanceFromItarsi } = await getDistance(ITARSI_LOCATION, dropLocation);

      if (tripType === "Local") {
        if (pickupDistanceFromItarsi > 15 || dropDistanceFromItarsi > 15) {
          return res.status(400).json({
            success: false,
            message: "For Local trips, both pickup and drop must be within 15 KM of Itarsi.",
          });
        }
      }

      if (["One Way", "Round Trip"].includes(tripType) && dropDistanceFromItarsi < 15) {
        return res.status(400).json({
          success: false,
          message: "Drop location must be at least 15 KM from Itarsi for this trip type.",
        });
      }
    } catch (distanceError) {
      console.warn("⚠️ Distance re-check skipped. Using frontend-calculated trip details.", distanceError.message);

      if (tripType === "Local" && requestedDistance > 15) {
        return res.status(400).json({
          success: false,
          message: "For Local trips, the trip distance must be within 15 KM of Itarsi.",
        });
      }

      if (["One Way", "Round Trip"].includes(tripType) && requestedDistance > 0 && requestedDistance < 15) {
        return res.status(400).json({
          success: false,
          message: "Trip distance must be at least 15 KM for this trip type.",
        });
      }
    }

    const newBooking = new Booking({
      name,
      mobile,
      email,
      paymentMode,
      carType,
      distance,
      totalFare,
      tollCount,
      pickupDate,
      pickupTime,
      tripType,
      pickupLocation,
      dropLocation,
      duration,
      whatsappOptIn,
      paymentStatus: "Pending",
    });

    const savedBooking = await newBooking.save();
    console.log("✅ Booking saved to MongoDB:", savedBooking);

    sendBookingWhatsAppAlerts({
      booking: savedBooking.toObject(),
      eventType: "cash_booking_created",
    });

    res.status(201).json({
      success: true,
      message: "Booking saved successfully",
      bookingId: savedBooking._id,
    });
  } catch (err) {
    console.error("🔥 Booking Error:", err.message || err);
    res.status(500).json({ success: false, message: "Booking failed", error: err.message });
  }
});

module.exports = router;
