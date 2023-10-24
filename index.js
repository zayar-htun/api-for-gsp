const express = require("express");
const app = express();

const cors = require("cors");
app.use(cors());

const multer = require("multer");
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "images/"); // Specify the directory where images should be saved
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + "-" + file.originalname);
    },
});

const upload = multer({ storage: storage });

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const jwt = require("jsonwebtoken");
const secret = "horse battery staple";

const { MongoClient, ObjectId } = require("mongodb");
const mongo = new MongoClient("mongodb://127.0.0.1");

const bcrypt = require("bcrypt");

const db = mongo.db("gspp");

function generateRandomCardNumber() {
    return `${generateRandomNumber(1000, 9999)} ${generateRandomNumber(
        1000,
        9999
    )} ${generateRandomNumber(1000, 9999)} ${generateRandomNumber(1000, 9999)}`;
}

function generateRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

app.get("/teacher", async function (req, res) {
    try {
        const teachers = await db.collection("teachers").find().toArray();
        res.status(200).json(teachers);
    } catch (error) {
        console.error("Error fetching teachers:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/bestcourses", async function (req, res) {
    const bestcourses = await db.collection("courses").aggregate([
        { $limit: 9 }
    ]).toArray();
    res.status(200).json(bestcourses);
});


//register
app.post("/stureg", upload.single("photo"), async function (req, res) {
    const fileName = req.file ? req.file.filename : null;
    const { name, email, password, profile } = req.body;
    
    if (!name || !email || !password || !profile) {
        return res
            .status(400)
            .json({ msg: "Required fields: name, email, profile, and password" });
    }
    let hash = await bcrypt.hash(password, 10);

    try {
        const result = await db.collection("users").insertOne({
            username: name,
            email,
            password: hash,
            profile,
            role: "Student",
            avatar: fileName, // Use the file name if a photo was uploaded
            enrolledCourses: [],
            chatRoom_id: [],
            type: "visa",
            amount: "30000",
            cardNumber: generateRandomCardNumber(),
            CVV: `${generateRandomNumber(100, 999)}`,
            expired_data: "12/12/2027",
        });
        return res.status(201).json({
            _id: result.insertedId,
            name,
            email,
            profile,
        });
    } catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(8888, () => {
    console.log("gsp api running at 8888");
});
