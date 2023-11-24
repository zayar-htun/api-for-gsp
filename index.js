const express = require("express");
const app = express();

const cors = require("cors");
app.use(cors());

const multer = require("multer");
const upload = multer({ dest: "images/" });
const uploadVideo = multer({ dest: "videos/" });

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
    const { name, email, profile, password } = req.body;

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
            amount: 30000,
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
    const { name, email, profile, password, bio } = req.body;

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
            bio: bio,
            student_id: [],
            courses: [],
            chatRoom_id: [],
            bluemark: false,
            type: "visa",
            amount: 30000,
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

//auth middleware
const auth = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ msg: "invalid: no token provided" });
    }

    jwt.verify(token, secret, function (err, user) {
        if (err) return res.status(403).json({ msg: "invalid token" });

        if (user) {
            res.locals.user = user;
            next();
        }
    });
};

//login
app.post("/login", async function (req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(403).json({
            msg: "Both email and password are required",
        });
    }

    let user = await db.collection("users").findOne({ email });
    if (!user) return res.status(403).json({ msg: "user not found" });

    const match = await bcrypt.compare(password, user.password);

    if (match) {
        const token = jwt.sign(user, secret);
        return res.status(201).json({ token, user });
    }

    return res.status(403).json({ msg: "incorrect password" });
});

// get user by token (through auth middleware)
app.get("/user", auth, async (req, res) => {
    const user = res.locals.user;

    let result = await db
        .collection("users")
        .findOne({ _id: ObjectId(user._id) });

    if (result) {
        return res.status(200).json(result);
    }

    return res.status(401).json({ msg: "user not found" });
});

//upload module
app.post(
    "/uploadmodule",
    uploadVideo.single("video"),
    async function (req, res) {
        const fileName = req.file.filename;
        const { title, description } = req.body;

        if (!title || !description) {
            return res.status(400).json({
                msg: "Required fields: title and description",
            });
        }

        try {
            const result = await db.collection("modules").insertOne({
                title: title,
                video: fileName,
                description: description,
            });
            return res.status(201).json({
                _id: result.insertedId,
            });
        } catch (error) {
            console.error("Registration error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    }
);

// //upload Course

app.post(
    "/uploadCourse",
    upload.single("photo"),
    auth,
    async function (req, res) {
        const user = res.locals.user;
        const fileName = req.file.filename;
        const { title, description, category, price, modules } = req.body;

        console.log(modules);
        console.log(typeof modules);

        if (!title || !description || !category || !price || !modules) {
            return res.status(400).json({
                msg: "Required fields: title, description, category, price, and modules (as an array)",
            });
        }
        const moduleIds = modules.split(",");

        // Convert the string IDs to ObjectId
        const moduleObjectIds = moduleIds.map(
            moduleId => new ObjectId(moduleId)
        );

        console.log(moduleObjectIds);

        try {
            const result = await db.collection("courses").insertOne({
                title: title,
                description: description,
                category: category,
                thumb: fileName, // Use the file name if a photo was uploaded
                price: price,
                courseOwner: new ObjectId(user._id),
                modules: moduleObjectIds, // Save the ObjectId array
                rating: 0,
                likes: [],
                comments: [],
            });
            return res.status(201).json({
                _id: result.insertedId,
            });
        } catch (error) {
            console.error("Registration error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    }
);

//best 9 courses
app.get("/bestcourses", async function (req, res) {
    const bestcourses = await db
        .collection("courses")
        .aggregate([{ $sort: { rating: -1 } }, { $limit: 9 }])
        .toArray();
    res.status(200).json(bestcourses);
});

//all courses
app.get("/allcourses", async function (req, res) {
    const allCourses = await db.collection("courses").find().toArray();

    res.status(200).json(allCourses);
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
                {
                    $lookup: {
                        from: "comments",
                        foreignField: "_id",
                        localField: "comments",
                        as: "commentDetail",
                        pipeline: [
                            {
                                $lookup: {
                                    from: "users",
                                    localField: "commentOwner",
                                    foreignField: "_id",
                                    as: "commentUser",
                                },
                            },
                        ],
                    },
                },
            ])
            .toArray();

        return res.json(data[0]);
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

//upload comment
app.post("/uploadComment", auth, async function (req, res) {
    const user = res.locals.user;
    const { commentedCourse, text } = req.body;

    if (!commentedCourse || !text) {
        return res.status(400).json({
            msg: "Required fields: Text required!!!",
        });
    }

    try {
        const courseObjectId = new ObjectId(commentedCourse);
        const result = await db.collection("comments").insertOne({
            commentOwner: new ObjectId(user._id),
            commentedCourse: courseObjectId,
            text: text,
            created_at: new Date(),
        });

        console.log(result.insertedId);
        if (result.insertedId) {
            // Check if commentedCourse exists in the courses collection
            const existingCourse = await db.collection("courses").findOne({
                _id: courseObjectId,
            });

            if (existingCourse) {
                // Update the corresponding course document with the new comment
                await db.collection("courses").updateOne(
                    { _id: courseObjectId },
                    {
                        $push: {
                            comments: result.insertedId,
                        },
                    }
                );
            }

            return res.status(201).json({
                _id: result.insertedId,
            });
        }
    } catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

//payment api
app.post("/payment", auth, async (req, res) => {
    const { accountNo, pincode, receiveNo, amount, id, teacherId } = req.body;
    const user = res.locals.user;

    if (!pincode || !accountNo || !receiveNo || !amount) {
        return res.status(403).json({
            msg: "Account Number, Pincode , Receive Account Number ,  are required",
        });
    }

    let findAccount = await db.collection("users").findOne({
        cardNumber: receiveNo,
    });

    if (!findAccount) return res.status(403).json({ msg: "account not found" });

    let senderAccount = await db.collection("users").findOne({
        cardNumber: accountNo,
    });

    // Check if the sender's account exists
    if (!senderAccount) {
        return res.status(403).json({ msg: "Sender's account not found" });
    }

    // Check if the provided pincode matches the sender's pincode
    if (senderAccount.CVV !== pincode) {
        return res
            .status(403)
            .json({ msg: "Incorrect pincode for the sender's account" });
    }

    const numericAmount = parseInt(amount);
    const receiveAccount = parseInt(receiveNo);
    const accountGiving = parseInt(accountNo);
    const courseId = new ObjectId(id);
    await db
        .collection("users")
        .updateOne(
            { cardNumber: receiveAccount },
            { $inc: { amount: numericAmount } }
        );

    await db
        .collection("users")
        .updateOne(
            { cardNumber: accountGiving },
            { $inc: { amount: -numericAmount } }
        );

    await db
        .collection("users")
        .updateOne(
            { _id: new ObjectId(user._id) },
            { $addToSet: { enrolledCourses: courseId } }
        );

    await db
        .collection("users")
        .updateOne(
            { _id: new ObjectId(teacherId) },
            { $addToSet: { student_id: new ObjectId(user._id) } }
        );

    const result = await db.collection("chatRooms").insertOne({
        participant: [new ObjectId(user._id), new ObjectId(teacherId)],
        messages: [],
    });

    if (result.insertedId) {
        const chatRoomId = result.insertedId;

        // Update teacher's document with chat room IDs
        await db.collection("users").updateOne(
            {
                _id: new ObjectId(teacherId),
                chatRoom_id: { $exists: true, $eq: null },
            },
            { $set: { chatRoom_id: [chatRoomId] } }
        );

        await db.collection("users").updateOne(
            {
                _id: new ObjectId(teacherId),
                chatRoom_id: { $exists: true, $ne: null },
            },
            { $addToSet: { chatRoom_id: chatRoomId } }
        );

        // Update user's document with chat room IDs
        await db.collection("users").updateOne(
            {
                _id: new ObjectId(user._id),
                chatRoom_id: { $exists: true, $eq: null },
            },
            { $set: { chatRoom_id: [chatRoomId] } }
        );

        await db.collection("users").updateOne(
            {
                _id: new ObjectId(user._id),
                chatRoom_id: { $exists: true, $ne: null },
            },
            { $addToSet: { chatRoom_id: chatRoomId } }
        );
    }
    return res.status(200).json({ msg: "Payment successful" });
});

//enrolled courses
app.get("/enrolledCourses", auth, async function (req, res) {
    const user = res.locals.user;
    try {
        const data = await db
            .collection("users")
            .aggregate([
                {
                    $match: { _id: new ObjectId(user._id) }, // Use "id" here
                },
                {
                    $lookup: {
                        from: "courses",
                        foreignField: "_id",
                        localField: "enrolledCourses",
                        as: "coursesEnrolled",
                    },
                },
            ])
            .toArray();

        return res.json(data[0]);
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

//top up

//login
app.post("/topup", auth, async function (req, res) {
    const user = res.locals.user;
    const { name, accountNo, pin, amount } = req.body;

    console.log(name);
    console.log(accountNo);
    console.log(pin);
    console.log(amount);

    if (!name || !accountNo || !pin || !amount) {
        return res.status(403).json({
            msg: "Name , Account Non, Pin code and Amount require when top up",
        });
    }

    const numericAmount = parseInt(amount);

    await db
        .collection("users")
        .updateOne(
            { _id: new ObjectId(user._id) },
            { $inc: { amount: numericAmount } }
        );

    return res.status(200).json({ msg: "Payment successful" });
});

// app.get("/chatRoom", auth, async function (req, res) {
//     const user = res.locals.user;
//     try {

//         const data = user.enrolledCourses.map(userEn => {
//             await db
//             .collection("chatRooms")
//             .aggregate([
//                 {
//                     $match: { _id: { $in: [user.enrolledCourses] } },
//                 },
//             ])
//             .toArray();
//         })
//         // const data = await db
//         //     .collection("chatRooms")
//         //     .aggregate([
//         //         {
//         //             $match: { _id: { $in: [user.enrolledCourses] } },
//         //         },
//         //     ])
//         //     .toArray();

//         console.log(data[0]);

//         return res.json(data[0]);
//     } catch (error) {
//         return res.status(500).json({ error: "Internal Server Error" });
//     }
// });

app.get("/chatRoom", auth, async function (req, res) {
    const user = res.locals.user;
    try {
        const data = await Promise.all(
            user.enrolledCourses.map(async (courseId) => {
                const result = await db
                    .collection("chatRooms")
                    .aggregate([
                        {
                            $match: { _id: courseId },
                        },
                    ])
                    .toArray();
                return result[0]; // Assuming you expect only one document per course
            })
        );

        console.log(data);

        return res.json(data);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});


app.listen(8888, () => {
    console.log("gsp api running at 8888");
});
