const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");

const mongo = new MongoClient("mongodb://localhost");
const db = mongo.db("gspp");

// Connect to the database
async function connectToDB() {
    await mongo.connect();
}

// Helper function to generate random usernames and emails
function generateRandomUserData(role) {
    const username = `${role.toLowerCase()}_${Math.floor(
        Math.random() * 100000
    )}`;
    const email = `${username}@example.com`;
    return { username, email };
}

// Function to generate a random date within a range
function generateRandomDate(start, end) {
    return new Date(
        start.getTime() + Math.random() * (end.getTime() - start.getTime())
    );
}

// Function to generate a random number between a range
function generateRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

// Function to generate a random boolean
function generateRandomBoolean() {
    return Math.random() < 0.5;
}

// Function to generate a random card number
function generateRandomCardNumber() {
    return `${generateRandomNumber(1000, 9999)} ${generateRandomNumber(
        1000,
        9999
    )} ${generateRandomNumber(1000, 9999)} ${generateRandomNumber(1000, 9999)}`;
}

// Seed users (admin, teachers, students)
async function seedUsers() {
    await db.collection("users").deleteMany({});

    const roles = ["Teacher", "Student"];
    const numTeachers = 20;
    const numStudents = 127;

    const usersData = [];

    // Seed admin users
    for (let i = 0; i < numTeachers; i++) {
        const userData = generateRandomUserData("Teacher");
        usersData.push({
            ...userData,
            password: await bcrypt.hash("password", 10),
            profile: `@${userData.username.substring(0, 4)}`,
            role: "Teacher",
            avatar: "teacher_avatar.jpg",
            bio: "Teacher bio",
            student_id: [], // Initialize an empty array
            courses: [],
            chatRoom_id: [],
            bluemark: generateRandomBoolean(),
            type: ["visa", "mastercard"][Math.floor(Math.random() * 2)],
            amount: 30000,
            cardNumber: generateRandomCardNumber(),
            CVV: `${generateRandomNumber(100, 999)}`,
            expired_data: "12/12/2027",
        });
    }

    // Seed student users
    for (let i = 0; i < numStudents; i++) {
        const userData = generateRandomUserData("Student");

        const enrolledCourses = [];
        const courses = await db.collection("courses").find().toArray();
        const numEnrolledCourses = Math.min(
            courses.length,
            Math.floor(Math.random() * 4) + 2
        );

        for (let j = 0; j < numEnrolledCourses; j++) {
            enrolledCourses.push(courses[j]._id);
        }

        usersData.push({
            ...userData,
            password: await bcrypt.hash("password", 10),
            profile: `@${userData.username.substring(0, 4)}`,
            role: "Student",
            avatar: "student_avatar.jpg",
            enrolledCourses,
            chatRoom_id: [],
            type: ["visa", "mastercard"][Math.floor(Math.random() * 2)],
            amount: 30000,
            cardNumber: generateRandomCardNumber(),
            CVV: `${generateRandomNumber(100, 999)}`,
            expired_data: "12/12/2027",
        });
    }

    // Insert the user data into the collection
    await db.collection("users").insertMany(usersData);

    // Insert student ObjectIds into teacher student_id
    const teacherUsers = usersData.filter(user => user.role === "Teacher");
    const studentUsers = usersData.filter(user => user.role === "Student");

    for (const teacher of teacherUsers) {
        const numStudentsToAssign = Math.floor(Math.random() * 11) + 10; // 10 to 20 students
        const randomStudentIds = getRandomStudentIds(studentUsers, numStudentsToAssign);
        teacher.student_id = randomStudentIds;
    }

    // Update the teacher users with student references
    for (const teacher of teacherUsers) {
        await db.collection("users").updateOne({ _id: teacher._id }, { $set: { student_id: teacher.student_id } });
    }
}

function getRandomStudentIds(studentUsers, count) {
    const shuffledStudents = [...studentUsers];
    for (let i = shuffledStudents.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledStudents[i], shuffledStudents[j]] = [shuffledStudents[j], shuffledStudents[i]];
    }
    return shuffledStudents.slice(0, count).map(student => student._id);
}


//seed admin

async function seedAdmin() {
    const roles = ["Admin"];
    const numAdmins = 3;

    const usersData = [];

    for (let i = 0; i < numAdmins; i++) {
        const userData = generateRandomUserData("Admin");
        const teacherIds = [];
        const studentIds = [];

        const teacherUsers = await db
            .collection("users")
            .find({ role: "Teacher" })
            .toArray();
        for (const teacher of teacherUsers) {
            teacherIds.push(teacher._id);
        }

        const studentUsers = await db
            .collection("users")
            .find({ role: "Student" })
            .toArray();
        for (const student of studentUsers) {
            studentIds.push(student._id);
        }
        usersData.push({
            ...userData,
            password: await bcrypt.hash("password", 10),
            profile: `@${userData.username.substring(0, 4)}`,
            role: "Admin",
            avatar: "admin_avatar.jpg", // Replace with a random admin avatar
            teacher_ids: teacherIds,
            student_ids: studentIds,
            type: ["visa", "mastercard"][Math.floor(Math.random() * 2)],
            amount: 30000,
            cardNumber: generateRandomCardNumber(),
            CVV: `${generateRandomNumber(100, 999)}`,
            expired_data: "12/12/2027",
        });
    }

    await db.collection("users").insertMany(usersData);
}

// Seed courses
// Seed courses
async function seedCourses() {
    await db.collection("courses").deleteMany({});
    const courseIdsForStu = [];

    const teachers = await db
        .collection("users")
        .find({ role: "Teacher" })
        .toArray();

    for (const teacher of teachers) {
        const courseIds = [];
        const numCoursesPerTeacher = 10;

        for (let i = 0; i < numCoursesPerTeacher; i++) {
            const category = ["Graphic Design", "Programming", "Accounting"][
                Math.floor(Math.random() * 3)
            ];

            let thumb;
            if (category === "Accounting") {
                thumb = "/src/assets/courses/thumbs/acc.jpeg";
            } else if (category === "Graphic Design") {
                thumb = "/src/assets/courses/thumbs/gd.jpg";
            } else if (category === "Programming") {
                thumb = "/src/assets/courses/thumbs/prog.jpeg";
            }

            const title = `Course Title ${i + 1}`;
            const description = "Course description";
            const price = Math.floor(Math.random() * 451) + 50; // Random price between 50 and 500
            const modules = [];

            const numModules = Math.floor(Math.random() * 5) + 6; // Random number of modules between 6 and 10
            for (let j = 0; j < numModules; j++) {
                modules.push({
                    title: `Module ${j + 1}`,
                    video: "https://example.com/video",
                    description: "Module description",
                });
            }

            const rating = Math.floor(Math.random() * 5) + 1; // Random rating between 1 and 5
            const likes = [];
            const comments = [];

            const courseData = {
                title,
                description,
                category,
                thumb, // Add the thumb field based on the category
                price,
                courseOwner: teacher._id,
                modules,
                rating,
                likes,
                comments,
            };

            const result = await db.collection("courses").insertOne(courseData);
            courseIds.push(result.insertedId);
            courseIdsForStu.push(result.insertedId);
        }

        await db
            .collection("users")
            .updateOne({ _id: teacher._id }, { $set: { courses: courseIds } });

        const students = await db
            .collection("users")
            .find({ role: "Student" })
            .toArray();

        for (const student of students) {
            // Generate random courseIds for each student
            const studentCourseIds = [];
            const numEnrolledCourses = Math.floor(Math.random() * courseIdsForStu.length) + 1;

            for (let i = 0; i < 20; i++) {
                const randomCourseId = courseIdsForStu[Math.floor(Math.random() * courseIdsForStu.length)];
                studentCourseIds.push(randomCourseId);
            }

            await db
                .collection("users")
                .updateOne(
                    { _id: student._id },
                    { $set: { enrolledCourses: studentCourseIds } }
                );
        }
    }
}


// Seed chat rooms
async function seedChatRooms() {
    await db.collection("chatRooms").deleteMany({});

    const students = await db
        .collection("users")
        .find({ role: "Student" })
        .toArray();
    const teachers = await db
        .collection("users")
        .find({ role: "Teacher" })
        .toArray();

    const chatRoomsData = [];

    for (const student of students) {
        const teacher = teachers[Math.floor(Math.random() * teachers.length)];

        chatRoomsData.push({
            participants: [student._id, teacher._id],
            messages: [],
        });
    }

    await db.collection("chatRooms").insertMany(chatRoomsData);
}

// Seed modules
async function seedModules() {
    await db.collection("modules").deleteMany({});

    const courses = await db.collection("courses").find().toArray();

    for (const course of courses) {
        const moduleIds = [];
        const numModules = Math.floor(Math.random() * 5) + 6; // Random number of modules between 6 and 10

        for (let i = 0; i < numModules; i++) {
            const module = {
                title: `Module ${i + 1}`,
                video: "https://example.com/video",
                description: "Module description",
            };

            const result = await db.collection("modules").insertOne(module);
            moduleIds.push(result.insertedId);
        }

        await db
            .collection("courses")
            .updateOne({ _id: course._id }, { $set: { modules: moduleIds } });
    }
}

// Seed transactions
async function seedTransactions() {
    await db.collection("transactions").deleteMany({});

    const users = await db.collection("users").find().toArray();
    const teachers = users.filter(user => user.role === "Teacher");
    const students = users.filter(user => user.role === "Student");

    const transactionsData = [];

    for (const user of users) {
        if (user.role !== "Admin" && user.role !== "Teacher") {
            continue;
        }

        const receiver =
            user.role === "Admin"
                ? teachers[Math.floor(Math.random() * teachers.length)]
                : teachers.filter(teacher => teacher._id !== user._id)[
                      Math.floor(Math.random() * (teachers.length - 1))
                  ];

        transactionsData.push({
            amount: Math.floor(Math.random() * 401) + 100, // Random amount between 100 and 500
            paymentMethod: ["visa", "mastercard"][
                Math.floor(Math.random() * 2)
            ],
            giver: user._id,
            teacherReceiver: receiver._id,
            adminReceiver: user.role === "Admin" ? user._id : null,
            whyTran: "Transaction reason",
            created_at: generateRandomDate(new Date(2022, 0, 1), new Date()), // Generate random date within a range
        });
    }

    await db.collection("transactions").insertMany(transactionsData);
}

// Seed messages
async function seedMessages() {
    await db.collection("messages").deleteMany({});

    const chatRooms = await db.collection("chatRooms").find().toArray();

    const messagesData = [];

    for (const chatRoom of chatRooms) {
        const sender = chatRoom.participants[Math.floor(Math.random() * 2)];
        const receiver = chatRoom.participants.find(
            participant => participant !== sender
        );

        messagesData.push({
            sender,
            textMessage: "Message content",
            created_at: new Date(),
        });

        await db
            .collection("chatRooms")
            .updateOne(
                { _id: chatRoom._id },
                { $push: { messages: messagesData[messagesData.length - 1] } }
            );
    }

    await db.collection("messages").insertMany(messagesData);
}

// Seed comments
// Seed comments
async function seedComments() {
    await db.collection("comments").deleteMany({});

    const users = await db
        .collection("users")
        .find({ role: "Student" })
        .toArray();
    const courses = await db.collection("courses").find().toArray();

    const commentsData = [];

    for (const user of users) {
        for (const course of courses) {
            const courseOwner = await db
                .collection("users")
                .findOne({ _id: course.courseOwner });
            const commentedCourse = course._id;

            const comment = {
                commentOwner: user._id,
                commentedCourse: commentedCourse,
                text: "Comment text",
                created_at: new Date(),
            };

            // commentsData.push({
            //     commentOwner: user._id,
            //     commentedCourse,
            //     text: "Comment text",
            //     created_at: new Date(),
            // });

            const result = await db.collection("comments").insertOne(comment);

            await db.collection("courses").updateOne(
                { _id: commentedCourse },
                {
                    $push: {
                        comments: result.insertedId,
                    },
                }
            );
        }
    }

    // await db.collection("comments").insertMany(commentsData);
}

// // Call the modified seedComments function
// seedComments();


// // Call the modified seedComments function
// seedComments();


// // Call the modified seedComments function
// seedComments();


//seed review 

async function seedReview() {
  const numReviews = 200;
  const reviewsData = [];

  const students = await db
      .collection("users")
      .find({ role: "Student" })
      .toArray();
  const courses = await db.collection("courses").find().toArray();

  for (let i = 0; i < numReviews; i++) {
      const randomStudent = students[Math.floor(Math.random() * students.length)];
      const randomCourse = courses[Math.floor(Math.random() * courses.length)];

      const review = {
          star: Math.floor(Math.random() * 5) + 1, // Random star rating between 1 and 5
          reviewComment: "This course is great!", // You can customize the review comment
          giver: randomStudent._id, // Random student as the giver
          original: randomCourse._id, // Random course as the original
      };

      reviewsData.push(review);
  }

  await db.collection("review").insertMany(reviewsData);
}
// Seed function
async function seed() {
    console.log("Started seeding...");

    await connectToDB();

    // Clear previous data from collections
    await db.collection("users").deleteMany({});
    await db.collection("courses").deleteMany({});
    await db.collection("chatRooms").deleteMany({});
    await db.collection("modules").deleteMany({});
    await db.collection("transactions").deleteMany({});
    await db.collection("messages").deleteMany({});
    await db.collection("comments").deleteMany({});
    await db.collection("review").deleteMany({});

    await seedUsers();
    await seedAdmin();
    await seedCourses();
    await seedChatRooms();
    await seedModules();
    await seedTransactions();
    await seedMessages();
    await seedComments();
    await seedReview();

    console.log("Seeding complete.");
    process.exit(0);
}

seed();
