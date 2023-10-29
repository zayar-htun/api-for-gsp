const express = require("express");
const app = express();

const cors = require("cors");
app.use(cors());

const multer = require("multer");
const upload = multer({ dest: "images/" });

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

//student register
app.post("/sturegister", upload.single("photo"), async function (req, res) {
    const fileName = req.file.filename;
    const {name,email,profile,password} = req.body;

    if (!name || !email || !password || !profile) {
        return res.status(400).json({
            msg: "Required fields: name, email, profile, and password",
        });
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


//teacher register
app.post("/teacherregister", upload.single("photo"), async function (req, res) {
    const fileName = req.file.filename;
    const {name,email,profile,password,bio} = req.body;

    if (!name || !email || !password || !profile || !bio) {
        return res.status(400).json({
            msg: "Required fields: name, email, profile, bio and password",
        });
    }

    let hash = await bcrypt.hash(password, 10);

    try {
        const result = await db.collection("users").insertOne({
            username: name,
            email,
            password: hash,
            profile,
            role: "Teacher",
            avatar: fileName,
            bio:bio,
            student_id: [],
            courses: [],
            chatRoom_id: [],
            bluemark:false,
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

//best 9 courses
app.get("/bestcourses", async function (req, res) {
    const bestcourses = await db
        .collection("courses")
        .aggregate([{ $sort: { rating: -1 } }, { $limit: 9 }])
        .toArray();
    res.status(200).json(bestcourses);
});

//course detail
app.get("/courseDetail/:id", async function (req, res) {
    const { id } = req.params; // Use "id" instead of "_id"

    try {
        const data = await db
            .collection("courses")
            .aggregate([
                {
                    $match: { _id: new ObjectId(id) }, // Use "id" here
                },
                {
                    $lookup: {
                        from: "users",
                        foreignField: "_id",
                        localField: "courseOwner",
                        as: "teacher",
                    },
                },
            ])
            .toArray();

        return res.json(data[0]);
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(8888, () => {
    console.log("gsp api running at 8888");
});
