// importing all modules
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";

const app = express();
const port = process.env.PORT || 3001; // Use PORT from environment, fallback to 3000 for local dev
// const port = 3001; // Use PORT from environment, fallback to 3000 for local dev
//databse connectivity
const { Client } = pkg;
const saltRounds = 10;

// defining a variable owner to set its value to admin name while login to check for assignment for that particular admin
let owner = "";
// Getting __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Check if we are in a production environment
const isProduction = process.env.NODE_ENV === "production";

// Create a new client based on the environment
const client = isProduction
  ? new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    })
  : new Client({
      user: "postgres",
      host: "localhost",
      database: "homework",
      password: "Postgres@123",
      port: 5432,
    });
client.connect();

// Connect to the database asynchronously
const connectToDatabase = async () => {
  try {
    await client.connect();
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection error:", error.stack);
  }
};

export { client, connectToDatabase };
console.log("Database connection status:", client);

//Home Page
app.get("/", (req, res) => {
  res.render("home.ejs");
});

// for login
app.post("/login", (req, res) => {
  res.render("login.ejs");
});

app.post("/check-user-login", async (req, res) => {
  console.log("Login attempt received:", req.body);
  const { username, password, type } = req.body;

  try {
    const result = await client.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    //returning login fail if a user doesnot exist
    if (result.rows.length === 0) {
      return res
        .status(201)
        .sendFile(path.join(__dirname, "views", "loginFail.html"));
    }

    //if not then getting the first user
    const user = result.rows[0];

    //checking the password that user entered to the database password that exists
    const matchPassword = await bcrypt.compare(password, user.password);

    //if password doesnot match or usertype doesnot match then returning login fail
    if (!matchPassword || type.toLowerCase() !== user.role.toLowerCase()) {
      return res
        .status(201)
        .sendFile(path.join(__dirname, "views", "loginFail.html"));
    }
    //getting all admins
    const adminList = await client.query("Select * from users where role=$1", [
      "Admin",
    ]);
    const adminName = adminList.rows;

    //console.log(type);
    //returning student.ejs if type is "User"
    if (type === "User") {
      res.render("student.ejs", {
        studentName: username,
        adminName: adminName,
      });

      //returning adminHome.ejs if type id "Admin" and setting the value of owner that we defined earlier to the admin name
    } else if (type === "Admin") {
      owner = username;
      console.log(username);
      res.render("AdminHome.ejs", { adminName: username });
    }
  } catch (error) {
    console.error("Error during user login:", error);
    res.status(500).json({ error: "An error occurred while logging in." });
  }
});

// for Signin
app.post("/signup", (req, res) => {
  res.render("signup.ejs");
});

app.post("/check-user-signin", async (req, res) => {
  const { username, password, type } = req.body;

  try {
    //checking if the username already exist
    const checkAdmin = await client.query(
      "Select * from users where username=$1",
      [username]
    );
    if (checkAdmin.rows.length > 0) {
      return res
        .status(201)
        .sendFile(path.join(__dirname, "views", "signInExist.html"));
    }
    //checking if password is minimum 5 character long for strong encryption
    if (password.length < 5) {
      return res
        .status(401)
        .sendFile(path.join(__dirname, "views", "shortPassword.html"));
    }

    //hashing the password using bcrypt and also salting it to 10 rounds for additional encryption
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert data into the users table
    const result = await client.query(
      "INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING *",
      [username, hashedPassword, type]
    );

    // Sending response back to the client
    if (type === "User") {
      const adminList = await db.query("Select * from users where role=$1", [
        "Admin",
      ]);
      const adminName = adminList.rows;
      res.render("student.ejs", {
        studentName: username,
        adminName: adminName,
      });
    } else if (type === "Admin") {
      owner = username; // Set the owner to the logged-in admin's username
      res.render("AdminHome.ejs", { adminName: username });
    }
  } catch (error) {
    console.error("Error inserting user:", error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the user." });
  }
});

//route for fetching all the admins
app.get("/admins", async (req, res) => {
  try {
    const role = "Admin"; // Specifying the role you're looking for
    //selecting all admins from the database
    const result = await client.query(
      "SELECT username FROM users WHERE role = $1",
      [role]
    );

    // Checking if any admins were found
    if (result.rows.length > 0) {
      // console.log(result.rows); // Login the fetched admin usernames
      // Rendering the admin list page and pass the fetched admins
      res.render("admin.ejs", { list: result.rows, owner });
    } else {
      res.status(404).json({ message: "No admins found." });
    }
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ error: "An error occurred while fetching admins." });
  }
  //res.render("listAdmin.ejs");
});

//route for uploading the Assignment
app.post("/upload", async (req, res) => {
  const { userId, task, admin } = req.body;
  const submissionDate = new Date();
  // console.log(userId);
  // console.log(task);
  // console.log(admin);

  // Checking if all the required fields are provided
  if (!userId || !task || !admin) {
    return res.status(401).sendFile(path.join(__dirname, "views", "fail.html"));
  }

  try {
    // Inserting the assignment into the database
    const isoDate = submissionDate.toISOString();
    const result = await client.query(
      "INSERT INTO assignment (user_id, task, admin, status,submission_date) VALUES ($1, $2, $3, $4,$5) RETURNING *",
      [userId, task, admin, "pending", isoDate]
    );

    // Responding with the newly created assignment
    res.render("assignmentSuccess.ejs", {
      userId: userId,
      task: task,
      submissionDate: submissionDate,
      status: "pending",
    });
  } catch (error) {
    console.error("Error submitting assignment:", error);
    res
      .status(500)
      .json({ error: "An error occurred while submitting the assignment." });
  }
});

//route where admin can view all the assignments submitted to him
app.get("/assignments", async (req, res) => {
  //console.log(owner);
  try {
    if (!owner) {
      return res.status(401).json({ error: "Unauthorized access." }); // Handle unauthorized access
    }
    //Fetching assignments where the admin matches the specified owner
    const assignment = await client.query(
      "SELECT * FROM assignment WHERE admin = $1",
      [owner]
    );
    // console.log(assignment.rows);
    return res.render("assignments.ejs", {
      assignment: assignment.rows,
      owner,
    });
    // Use result.rows to access the actual data
  } catch (error) {
    console.error("Error fetching assignments:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching assignments." });
  }
});

// Accepting an assignment
app.post("/assignments/:id/accept", async (req, res) => {
  const assignmentId = req.params.id;
  try {
    //changing the status
    await client.query(
      "UPDATE assignment SET status = 'accepted' WHERE id = $1",
      [assignmentId]
    );
    res.json({ success: true, message: "Assignment accepted" });
  } catch (error) {
    console.error("Error accepting assignment:", error);
    res
      .status(500)
      .json({ success: false, message: "Error accepting assignment" });
  }
});

// Rejecting an assignment
app.post("/assignments/:id/reject", async (req, res) => {
  const assignmentId = req.params.id;
  try {
    //changing the status
    await client.query(
      "UPDATE assignment SET status = 'rejected' WHERE id = $1",
      [assignmentId]
    );
    res.json({ success: true, message: "Assignment rejected" });
  } catch (error) {
    console.error("Error rejecting assignment:", error);
    res
      .status(500)
      .json({ success: false, message: "Error rejecting assignment" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
