require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const mongoose = require('mongoose');
const requestIp = require('request-ip');
const device = require('express-device');
const cors = require('cors')
const bodyParser = require("body-parser")

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// MongoDB connection setup
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Define MongoDB schema and model for tracking info
const trackingSchema = new mongoose.Schema({
    mailId: String,
    timestamp: { type: Date, default: Date.now },
    deviceType: String,
    ipAddress: String,
});

const contactSchema = new mongoose.Schema({
    cin: String,
    company_name: String,
    state: String,
    activity: String,
    email: String,
    email_sent: Boolean,
    doi: String,
});

// Create a model based on the schema
const Contact = mongoose.model('Contact', contactSchema);

const TrackingInfo = mongoose.model('TrackingInfo', trackingSchema);

app.use(cors())
app.use(device.capture());
app.use(bodyParser.json())

// Route to serve images and track metrics
app.get('/assets/:mailId', async (req, res) => {
    const { mailId } = req.params;
    const ipAddress = requestIp.getClientIp(req);

    const { device } = req;

    // Save tracking info to MongoDB
    const trackingData = new TrackingInfo({
        mailId,
        ipAddress,
        deviceType: device.type || 'Unknown',
    });
    await trackingData.save();

    // Serve the image (replace with actual image serving logic)
    // For example, serving a placeholder image
    const imgPath = `${__dirname}/assets/avtl.png`;
    res.sendFile(imgPath);
});

app.get('/contacts', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const filters = {};

    // Parse and apply filters
    // if (req.query.filters) {
    //     filters = JSON.parse(req.query.filters)
    // }

    try {
        const query = Contact.find(filters)
            .skip(skip)
            .limit(limit);

        const contacts = await query.exec();

        res.json({
            contacts,
            currentPage: page,
            totalPages: Math.ceil(await Contact.countDocuments() / limit),
        });
    } catch (error) {
        console.error('Error fetching contacts:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.patch("/contact/update/:contactId", async (req, res) => {
    try {
        const contactId = req.params.contactId
        const body = req.body

        await Contact.updateOne({
            _id: contactId,
        }, body)

        return res.status(201).json({
            message: "Updated"
        })
    }
    catch (err) {
        res.status(500).json({
            message: "Internal server error"
        })
    }
})

app.get("/dashboard", async (req, res) => {
    try {
        const [totalContacts, totalSent] = await Promise.all([
            Contact.countDocuments(),
            Contact.countDocuments({ mailingStage: 1 })
        ]);

        res.json({
            totalContacts,
            totalSent
        });

    }
    catch (err) {
        console.error("Failed to fetch dashboard")
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
