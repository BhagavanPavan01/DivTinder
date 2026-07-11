# DivTinder Backend

A modern backend application built with Node.js and Express that provides a matching/connection platform similar to Tinder. This project allows users to sign up, create profiles, send connection requests, and manage their connections.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation & Setup](#installation--setup)
- [Project Structure](#project-structure)
- [Required Packages](#required-packages)
- [How It Works](#how-it-works)
- [API Documentation](#api-documentation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Database Models](#database-models)

---

## ✨ Features

- **User Authentication**: Sign up and login functionality with JWT tokens
- **Profile Management**: Create and edit user profiles with password management
- **Password Reset**: Secure password reset with token-based verification
- **Connection Requests**: Send and manage connection requests
- **User Discovery**: Browse and discover other users on the platform
- **Connection Management**: Accept, reject, and view connections
- **JWT Authentication**: Secure API endpoints with JWT token authentication
- **Password Encryption**: Secure password hashing using bcrypt

---

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js 5.2.1
- **Database**: MongoDB (Mongoose ODM 9.1.1)
- **Authentication**: JWT (JSON Web Tokens) 9.0.3
- **Security**: bcrypt 6.0.0
- **Utilities**: Cookie Parser 1.4.7, Dotenv 17.2.4, Validator 13.15.26
- **Development**: Nodemon 3.1.11

---

## 📦 Required Packages

All dependencies are listed in `package.json`:

```json
{
  "dependencies": {
    "bcrypt": "^6.0.0",              // Password hashing
    "cookie-parser": "^1.4.7",       // Parse cookies
    "dotenv": "^17.2.4",             // Environment variables
    "express": "^5.2.1",             // Web framework
    "jsonwebtoken": "^9.0.3",        // JWT authentication
    "mongoose": "^9.1.1",            // MongoDB ODM
    "nodemon": "^3.1.11",            // Development auto-reload
    "validator": "^13.15.26"         // Data validation
  }
}
```

### Installation of Packages

```bash
npm install
```

Install specific packages:
```bash
npm install bcrypt cookie-parser dotenv express jsonwebtoken mongoose validator nodemon
```

---

## 🏗 Project Structure

```
divTinder-backend/
├── src/
│   ├── App.js                      # Main application file
│   ├── config/
│   │   └── database.js             # MongoDB connection configuration
│   ├── middlewares/
│   │   ├── auth.js                 # JWT authentication middleware
│   │   └── handlingErrors.js       # Error handling middleware
│   ├── models/
│   │   ├── user.js                 # User schema and methods
│   │   └── connectionRequest.js    # Connection request schema
│   ├── routes/
│   │   ├── auth.js                 # Authentication routes
│   │   ├── profile.js              # Profile routes
│   │   ├── request.js              # Connection request routes
│   │   └── user.js                 # User routes
│   ├── utils/
│   │   └── validator.js            # Data validation functions
│   └── PracticeCodes/              # Practice/test code files
├── package.json                     # Project dependencies
├── .env                             # Environment variables (create this)
└── README.md                        # Documentation
```

---

## 🔧 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud Atlas)
- NPM or Yarn

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd divTinder-backend
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Create Environment Variables
Create a `.env` file in the root directory:

```env
MONGO_URI=mongodb://localhost:27017/divtinder
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
PORT=3000
```

### Step 4: Update Database Connection
Edit `src/config/database.js` with your MongoDB connection string from `.env`

### Step 5: Run the Application
```bash
npm start
```

The server will start at `http://localhost:3000`

---

## 🚀 Running the Application

### Development Mode (with auto-reload)
```bash
npm start
```

### Production Mode
```bash
node src/App.js
```

### Console Output
```
Database connection is established...
The server started successfully!...
```

---

## 📚 How It Works

### Authentication Flow

1. **User Registration (Sign Up)**
   - User provides firstName, lastName, emailId, and password
   - Password is hashed using bcrypt with salt rounds of 10
   - User document is created in MongoDB
   - Response: Success message

2. **User Login**
   - User provides emailId and password
   - System finds user by emailId
   - Password is compared with stored hash using bcrypt
   - JWT token is generated and stored in cookies
   - Token expires in 7 hours

3. **User Authentication**
   - All protected routes use `userAuth` middleware
   - Middleware extracts JWT token from cookies
   - Token is verified and user data is attached to request object
   - Request proceeds only if token is valid

### Connection System

1. **Send Connection Request**
   - Authenticated user sends request to another user
   - Status can be "interested" or "ignored"
   - System prevents duplicate connections
   - Notifies recipient of new request

2. **Review Connection Request**
   - Recipient can "accept" or "reject" request
   - Once accepted, users become connected
   - Both users can see each other in their connections

3. **Connection States**
   - `interested`: Initial request sent
   - `ignored`: User marked as uninterested
   - `accepted`: Both users agreed to connect
   - `rejected`: Request was declined

### Data Flow

```
Client Request → Routes → Middleware (auth) → Controller Logic → Database → Response
```

---

## 🔌 API Documentation

### Base URL
```
http://localhost:3000
```

---

## 🔐 Authentication Routes

### 1. Sign Up
**Endpoint**: `POST /Signup`

**How It Works**:
- User registers with their personal details
- Password is encrypted using bcrypt (10 salt rounds)
- User document is saved in MongoDB
- Returns success message upon account creation

**Full API Path**:
```
http://localhost:3000/Signup
```

**Request Body**:
```json
{
  "firstName": "Pavan",
  "lastName": "Bhagavan",
  "emailId": "pavan.bhagavan@gmail.com",
  "password": "Pavan@2026Dev123"
}
```

**Request Headers**:
```
Content-Type: application/json
```

**Response** (Success - Status: 200):
```
user Signup successfully..!
```

**Response** (Error - Status: 400):
```json
{
  "error": "Error to SignUp the user : Invalid email format"
}
```

**Example cURL Request**:
```bash
curl -X POST http://localhost:3000/Signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Pavan",
    "lastName": "Bhagavan",
    "emailId": "pavan.bhagavan@gmail.com",
    "password": "Pavan@2026Dev123"
  }'
```

---

### 2. Login
**Endpoint**: `POST /login`

**How It Works**:
- User submits email and password
- System finds user by emailId
- Password is compared with hashed password using bcrypt
- JWT token is generated and stored in HTTP-only cookies
- Token remains valid for 7 hours
- All subsequent requests use this token for authentication

**Full API Path**:
```
http://localhost:3000/login
```

**Request Body**:
```json
{
  "emailId": "pavan.bhagavan@gmail.com",
  "password": "Pavan@2026Dev123"
}
```

**Request Headers**:
```
Content-Type: application/json
```

**Response** (Success - Status: 200):
```
Login successfully...!
```

**Response Headers** (Cookie Auto-Set):
```
Set-Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....; Path=/; HttpOnly; Max-Age=25200
```

**Response** (Error - User Not Found - Status: 400):
```json
{
  "error": "Error to Login the user : User not found...!"
}
```

**Response** (Error - Wrong Password - Status: 400):
```json
{
  "error": "Error to Login the user : Password is Incorrect...!"
}
```

**Example cURL Request**:
```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailId": "pavan.bhagavan@gmail.com",
    "password": "Pavan@2026Dev123"
  }' \
  -c cookies.txt
```

---

### 3. Logout
**Endpoint**: `POST /logout`

**How It Works**:
- Clears the JWT token from cookies
- Sets cookie expiration to current time
- User is logged out and cannot access protected routes
- No request body needed

**Full API Path**:
```
http://localhost:3000/logout
```

**Authentication**: ❌ Not required

**Request Body**: Empty (not required)

**Response** (Status: 200):
```
logout successfully
```

**Response Headers** (Cookie Cleared):
```
Set-Cookie: token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT
```

**Example cURL Request**:
```bash
curl -X POST http://localhost:3000/logout \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

---

## 👤 Profile Routes

### 1. Get User Profile
**Endpoint**: `GET /profile/view`

**How It Works**:
- Retrieves the logged-in user's complete profile information
- Requires valid JWT token in cookies
- Returns all user details including personal info and professional skills
- Token is extracted from cookies by userAuth middleware
- User data is available in req.user object

**Full API Path**:
```
http://localhost:3000/profile/view
```

**Authentication**: ✅ Required (JWT Token in Cookie)

**Request Headers**:
```
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....
```

**Query Parameters**: None

**Response** (Success - Status: 200):
```json
{
  "_id": "65a123f456gh789ijk012lmn",
  "firstName": "Pavan",
  "lastName": "Bhagavan",
  "emailId": "pavan.bhagavan@gmail.com",
  "age": 26,
  "gender": "male",
  "photoUrl": "https://example.com/pavan.jpg",
  "about": "Software Developer passionate about Node.js and MongoDB",
  "skills": ["nodejs", "express", "mongodb", "react"],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T14:20:00Z"
}
```

**Response** (Error - No Token - Status: 400):
```json
{
  "error": "Error : jwt must be provided"
}
```

**Response** (Error - Invalid Token - Status: 400):
```json
{
  "error": "Error : Invalid token"
}
```

**Example cURL Request**:
```bash
curl -X GET http://localhost:3000/profile/view \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

---

### 2. Edit User Profile
**Endpoint**: `PATCH /profile/edit`

**How It Works**:
- Updates user profile information
- Validates edit request data using validateEditProfileData function
- Prevents editing of sensitive fields (emailId, password)
- Updates only allowed fields dynamically
- Returns success message with user's lastName
- All changes are immediately saved to MongoDB

**Full API Path**:
```
http://localhost:3000/profile/edit
```

**Authentication**: ✅ Required (JWT Token in Cookie)

**Request Body** (Example - Update multiple fields):
```json
{
  "firstName": "Pavan",
  "age": 26,
  "gender": "male",
  "photoUrl": "https://example.com/pavan-updated.jpg",
  "about": "Software Developer with 3+ years experience in Node.js and MongoDB",
  "skills": ["nodejs", "express", "mongodb", "react", "javascript"]
}
```

**Allowed Fields to Edit**:
- firstName
- lastName
- age
- gender
- photoUrl
- about
- skills

**Request Headers**:
```
Content-Type: application/json
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....
```

**Response** (Success - Status: 200):
```
Bhagavan, your profile updated successfully
```

**Response** (Error - Invalid Edit Request - Status: 400):
```json
{
  "error": "ERROR : Invalid Edit Request"
}
```

**Example cURL Request**:
```bash
curl -X PATCH http://localhost:3000/profile/edit \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "age": 26,
    "about": "Software Developer with expertise in Node.js",
    "skills": ["nodejs", "express", "mongodb", "react"]
  }'
```

---

### 3. Forgot Password
**Endpoint**: `POST /profile/forgot`

**How It Works**:
- User requests password reset by providing email
- Generates a random 32-byte reset token
- Token is hashed using SHA-256 before saving to database
- Token is valid for only 5 minutes
- Returns generic message (doesn't reveal if email exists - security feature)
- Reset link is logged to console (in production: send via email)
- Hash stored in DB prevents token exposure even if DB is breached

**Full API Path**:
```
http://localhost:3000/profile/forgot
```

**Authentication**: ❌ Not required

**Request Body**:
```json
{
  "emailId": "pavan.bhagavan@gmail.com"
}
```

**Request Headers**:
```
Content-Type: application/json
```

**Response** (Status: 200 - Always):
```json
{
  "message": "If this email exists, a reset link has been sent."
}
```

**Behind the Scenes** (Not visible to user):
- Reset token generated: `abc123def456ghi789jkl012mno345pqr`
- Hashed token: `7e1f8a9b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r`
- Reset link: `http://localhost:3000/reset-password/abc123def456ghi789jkl012mno345pqr`
- Token expires at: (current time + 5 minutes)

**Security Note**: The response is identical whether the email exists or not, preventing email enumeration attacks.

**Example cURL Request**:
```bash
curl -X POST http://localhost:3000/profile/forgot \
  -H "Content-Type: application/json" \
  -d '{
    "emailId": "pavan.bhagavan@gmail.com"
  }'
```

---

### 4. Reset Password
**Endpoint**: `POST /profile/reset/:token`

**How It Works**:
- User provides the reset token received in email and new password
- Token is hashed using SHA-256 and compared with DB hash
- System checks if token exists and hasn't expired (5-minute window)
- New password is hashed with bcrypt (10 salt rounds)
- Password is updated in database
- User can then login with new password
- Token becomes invalid after use

**Full API Path**:
```
http://localhost:3000/profile/reset/abc123def456ghi789jkl012mno345pqr
```

**Path Parameters**:
- `token`: The reset token received in password reset email (32 bytes hex)

**Authentication**: ❌ Not required

**Request Body**:
```json
{
  "newPassword": "Pavan@NewPassword2026"
}
```

**Request Headers**:
```
Content-Type: application/json
```

**Response** (Success - Status: 200):
```json
{
  "message": "Password reset successfully"
}
```

**Response** (Error - Invalid/Expired Token - Status: 400):
```json
{
  "message": "Token invalid or expired"
}
```

**Token Validation Process**:
1. Token from URL is hashed using SHA-256
2. Hashed token is searched in database
3. resetPasswordExpires field is checked (must be > current time)
4. If both conditions match, password is updated
5. Both resetPasswordToken and resetPasswordExpires are cleared

**Example cURL Request**:
```bash
curl -X POST http://localhost:3000/profile/reset/abc123def456ghi789jkl012mno345pqr \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "Pavan@NewPassword2026"
  }'
```

---

## 🔗 Connection Request Routes

### 1. Send Connection Request
**Endpoint**: `POST /request/send/:status/:toUserId`

**How It Works**:
- Authenticated user sends a connection request to another user
- System validates the status (must be "interested" or "ignored")
- Checks if recipient user exists in database
- Prevents duplicate connections (checks both directions)
- Creates a new ConnectionRequest document in MongoDB
- Returns success message with both users' names and request details
- Recipient can later accept, reject, or ignore the request

**Full API Path Examples**:
```
http://localhost:3000/request/send/interested/65a123f456gh789ijk012lmn
http://localhost:3000/request/send/ignored/65a123f456gh789ijk012lmn
```

**Path Parameters**:
- `status`: Must be either "interested" or "ignored"
- `toUserId`: MongoDB ObjectId of the user receiving the request

**Authentication**: ✅ Required (JWT Token in Cookie)

**Request Body**: Empty (not required)

**Request Headers**:
```
Content-Type: application/json
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....
```

**Response** (Success - Status: 200):
```json
{
  "message": "Pavan is interested in Bhagavan",
  "data": {
    "_id": "65a456f789gh012ijk345lmn",
    "fromUserId": "65a123f456gh789ijk012lmn",
    "toUserId": "65a234f567gh890ijk123lmn",
    "status": "interested",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Response** (Error - Invalid Status - Status: 400):
```json
{
  "message": "Invalid status type : invalid_status"
}
```

**Response** (Error - User Not Found - Status: 404):
```json
{
  "message": "Sending the wrong User"
}
```

**Response** (Error - Connection Already Exists - Status: 400):
```json
{
  "message": "Connection Already Exists!"
}
```

**Connection Request States**:
- **interested**: Initial connection request - waiting for user response
- **ignored**: User marked as uninterested - cannot reconnect until ignored is removed

**Duplicate Prevention Logic**:
- Checks if connection exists from User A → User B
- Also checks if connection exists from User B → User A
- Prevents multiple requests between same pair of users

**Example cURL Request**:
```bash
curl -X POST http://localhost:3000/request/send/interested/65a234f567gh890ijk123lmn \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

---

### 2. Review Connection Request
**Endpoint**: `POST /request/review/:status/:requestId`

**How It Works**:
- Recipient reviews a pending connection request (status must be "interested")
- User can either "accept" or "reject" the request
- System validates the request belongs to logged-in user as recipient
- Only interested requests can be reviewed (security check)
- Updates the connection request status in database
- Once accepted, both users appear in each other's connections list
- Returns updated request with new status

**Full API Path Examples**:
```
http://localhost:3000/request/review/accepted/65a456f789gh012ijk345lmn
http://localhost:3000/request/review/rejected/65a456f789gh012ijk345lmn
```

**Path Parameters**:
- `status`: Must be either "accepted" or "rejected"
- `requestId`: MongoDB ObjectId of the connection request to review

**Authentication**: ✅ Required (JWT Token in Cookie)

**Request Body**: Empty (not required)

**Request Headers**:
```
Content-Type: application/json
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....
```

**Response** (Success - Accepted - Status: 200):
```json
{
  "message": "Connection request accepted",
  "data": {
    "_id": "65a456f789gh012ijk345lmn",
    "fromUserId": "65a123f456gh789ijk012lmn",
    "toUserId": "65a234f567gh890ijk123lmn",
    "status": "accepted",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:40:00Z"
  }
}
```

**Response** (Success - Rejected - Status: 200):
```json
{
  "message": "Connection request rejected",
  "data": {
    "_id": "65a456f789gh012ijk345lmn",
    "fromUserId": "65a123f456gh789ijk012lmn",
    "toUserId": "65a234f567gh890ijk123lmn",
    "status": "rejected",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:40:00Z"
  }
}
```

**Response** (Error - Status Not Allowed - Status: 400):
```json
{
  "message": "Status not allowed"
}
```

**Response** (Error - Request Not Found - Status: 404):
```json
{
  "message": "Connection request not found."
}
```

**Validation Checks**:
1. Status must be "accepted" or "rejected"
2. RequestId must exist in database
3. Logged-in user must be the recipient (toUserId)
4. Original status must be "interested" (cannot review already accepted/rejected requests)

**After Acceptance**:
- Connection becomes "accepted"
- Both users can see each other in /user/connections endpoint
- They can communicate further (in extended features)

**Example cURL Request**:
```bash
curl -X POST http://localhost:3000/request/review/accepted/65a456f789gh012ijk345lmn \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

---

## 👥 User Routes

### 1. Get Received Connection Requests
**Endpoint**: `GET /user/requests/received`

**How It Works**:
- Retrieves all pending connection requests sent TO the logged-in user
- Returns only requests with status "interested" (pending)
- Populates sender's profile information (limited fields for privacy)
- Allows user to see who wants to connect with them
- Results can be acted upon using /request/review endpoint

**Full API Path**:
```
http://localhost:3000/user/requests/received
```

**Authentication**: ✅ Required (JWT Token in Cookie)

**Query Parameters**: None

**Request Headers**:
```
Content-Type: application/json
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....
```

**Response** (Success - Status: 200):
```json
{
  "message": "Data fetched successfully",
  "data": [
    {
      "_id": "65a456f789gh012ijk345lmn",
      "fromUserId": {
        "_id": "65a123f456gh789ijk012lmn",
        "firstName": "Pavan",
        "lastName": "Bhagavan",
        "photoUrl": "https://example.com/pavan.jpg",
        "age": 26,
        "gender": "male",
        "about": "Software Developer passionate about Node.js",
        "skills": ["nodejs", "express", "mongodb"]
      },
      "status": "interested",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    {
      "_id": "65a567f890gh123ijk456lmn",
      "fromUserId": {
        "_id": "65a234f567gh890ijk123lmn",
        "firstName": "Raj",
        "lastName": "Kumar",
        "photoUrl": "https://example.com/raj.jpg",
        "age": 28,
        "gender": "male",
        "about": "Full Stack Developer",
        "skills": ["react", "nodejs", "python"]
      },
      "status": "interested",
      "createdAt": "2024-01-15T09:15:00Z"
    }
  ]
}
```

**Response** (Error - No Token - Status: 400):
```json
{
  "error": "ERROR : jwt must be provided"
}
```

**Response** (Success - No Requests - Status: 200):
```json
{
  "message": "Data fetched successfully",
  "data": []
}
```

**Safe Fields Returned** (Privacy Protected):
- firstName, lastName (basic identity)
- photoUrl (profile picture)
- age, gender (demographics)
- about (bio/description)
- skills (professional info)

**Unsafe Fields NOT Returned** (Hidden for Privacy):
- emailId (private contact)
- password (never exposed)
- resetPasswordToken, resetPasswordExpires

**Example cURL Request**:
```bash
curl -X GET http://localhost:3000/user/requests/received \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

---

### 2. Get All Connections
**Endpoint**: `GET /user/connections`

**How It Works**:
- Retrieves all users the logged-in user is CONNECTED with
- Only returns requests with status "accepted"
- Checks both directions (toUserId and fromUserId)
- Extracts the connected user's profile from each connection
- Shows the network of people you've successfully connected with
- Returns safe profile information without sensitive data

**Full API Path**:
```
http://localhost:3000/user/connections
```

**Authentication**: ✅ Required (JWT Token in Cookie)

**Query Parameters**: None (Pagination can be added)

**Request Headers**:
```
Content-Type: application/json
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....
```

**Response** (Success - Status: 200):
```json
{
  "data": [
    {
      "_id": "65a234f567gh890ijk123lmn",
      "firstName": "Jane",
      "lastName": "Smith",
      "photoUrl": "https://example.com/jane.jpg",
      "age": 24,
      "gender": "female",
      "about": "Full Stack Developer interested in Web Technologies",
      "skills": ["react", "nodejs", "javascript"]
    },
    {
      "_id": "65a345f678gh901ijk234lmn",
      "firstName": "Alice",
      "lastName": "Johnson",
      "photoUrl": "https://example.com/alice.jpg",
      "age": 25,
      "gender": "female",
      "about": "Software Developer & Tech Enthusiast",
      "skills": ["python", "django", "postgresql"]
    },
    {
      "_id": "65a456f789gh012ijk345lmn",
      "firstName": "Bob",
      "lastName": "Wilson",
      "photoUrl": "https://example.com/bob.jpg",
      "age": 27,
      "gender": "male",
      "about": "DevOps Engineer with Cloud expertise",
      "skills": ["aws", "docker", "kubernetes"]
    }
  ]
}
```

**Response** (Success - No Connections - Status: 200):
```json
{
  "data": []
}
```

**Database Query Logic**:
```javascript
// Find all connections where logged-in user is involved
ConnectionRequest.find({
  $or: [
    { toUserId: loggedInUserId, status: "accepted" },
    { fromUserId: loggedInUserId, status: "accepted" }
  ]
}).populate("fromUserId", USER_SAFE_DATA).populate("toUserId", USER_SAFE_DATA)

// Extract the other user from each connection
// If I'm the sender (fromUserId), return the recipient (toUserId)
// If I'm the recipient (toUserId), return the sender (fromUserId)
```

**Example cURL Request**:
```bash
curl -X GET http://localhost:3000/user/connections \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

---

### 3. Get User Feed
**Endpoint**: `GET /user/feed`

**How It Works**:
- Returns list of all users available to connect with
- Excludes the logged-in user themselves
- Excludes users with existing connections (both directions)
- Excludes users where a request already exists (pending or past)
- Provides fresh profiles to send connection requests to
- Supports pagination for handling large user databases
- Helps users discover potential connections on the platform

**Full API Path**:
```
http://localhost:3000/user/feed
http://localhost:3000/user/feed?page=2&limit=10
```

**Authentication**: ✅ Required (JWT Token in Cookie)

**Query Parameters** (Optional):
- `page`: Page number (starts from 1)
- `limit`: Number of results per page (default: 10)

**Example Query**:
```
GET /user/feed?page=1&limit=5
```

**Request Headers**:
```
Content-Type: application/json
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....
```

**Response** (Success - Status: 200):
```json
{
  "data": [
    {
      "_id": "65a234f567gh890ijk123lmn",
      "firstName": "Priya",
      "lastName": "Sharma",
      "photoUrl": "https://example.com/priya.jpg",
      "age": 23,
      "gender": "female",
      "about": "Junior Software Developer learning MERN Stack",
      "skills": ["javascript", "react", "nodejs"]
    },
    {
      "_id": "65a567f890gh123ijk456lmn",
      "firstName": "Arun",
      "lastName": "Patel",
      "photoUrl": "https://example.com/arun.jpg",
      "age": 27,
      "gender": "male",
      "about": "Backend Developer with 5+ years experience",
      "skills": ["nodejs", "express", "mongodb", "postgresql"]
    },
    {
      "_id": "65a678f901gh234ijk567lmn",
      "firstName": "Sarah",
      "lastName": "Williams",
      "photoUrl": "https://example.com/sarah.jpg",
      "age": 26,
      "gender": "female",
      "about": "Senior Full Stack Developer",
      "skills": ["react", "nodejs", "python", "aws", "docker"]
    }
  ]
}
```

**Response** (Success - No More Users - Status: 200):
```json
{
  "data": []
}
```

**Feed Algorithm**:
1. Fetch all users from database
2. Remove self (logged-in user)
3. Fetch all connection requests where user is involved (any status)
4. Fetch all accepted connections where user is involved
5. Remove users with existing connections or requests
6. Apply pagination (skip and limit)
7. Return safe profile data

**Pagination Example**:
```
Page 1: ?page=1&limit=10  → Results 1-10
Page 2: ?page=2&limit=10  → Results 11-20
Page 3: ?page=3&limit=10  → Results 21-30
```

**Example cURL Request (Page 1, 5 results per page)**:
```bash
curl -X GET "http://localhost:3000/user/feed?page=1&limit=5" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

**Example cURL Request (Default pagination)**:
```bash
curl -X GET http://localhost:3000/user/feed \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

---

## 🔒 Authorization Header

For all protected routes (marked with ✅), include JWT token in one of two ways:

**Option 1: Cookie** (Automatically sent by browser)
```
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Option 2: Authorization Header** (For API clients)
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🗄 Database Models

### User Schema
```javascript
{
  firstName: String (required),
  lastName: String (required),
  emailId: String (required, unique),
  password: String (required, hashed),
  age: Number,
  gender: String,
  photoUrl: String,
  about: String,
  skills: [String],
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

### Connection Request Schema
```javascript
{
  fromUserId: ObjectId (reference to User),
  toUserId: ObjectId (reference to User),
  status: String (enum: ["interested", "ignored", "accepted", "rejected"]),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

---

## 📝 Environment Variables

Create a `.env` file in the root directory:

```env
# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/divtinder

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key

# Server Configuration
PORT=3000
NODE_ENV=development
```

---

## 🐛 Error Handling

All API errors follow this format:

```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes
- `200`: Success
- `400`: Bad Request / Validation Error
- `404`: Resource Not Found
- `500`: Server Error

---

## 🔐 Security Features

- **Password Encryption**: Bcrypt with 10 salt rounds
- **JWT Tokens**: Secure token-based authentication
- **Email Enumeration Protection**: Password reset doesn't reveal if email exists
- **Token Expiration**: 7-hour cookie expiration
- **Cookie Parser**: Secure cookie handling

---

## 📞 Support

For issues or questions, please contact: Pavan (Author)

---

## 📄 License

ISC

---

## 🚦 Getting Started Quick Reference

```bash
# 1. Install dependencies
npm install

# 2. Create .env file with MongoDB URI and JWT secret

# 3. Start the server
npm start

# 4. Server runs on http://localhost:3000

# 5. Test endpoints using Postman or similar tool
```

---

**Latest Update**: February 2026  
**Version**: 1.0.0

---

## 💬 Chat APIs

- **Base URL**: `http://localhost:3000`
- **Chat route prefix**: `/api` (chat endpoints are mounted at `/api`)

### Endpoints
- `GET /api/chats` — Get all chats for the logged-in user (pinned first, then recent). Requires authentication.
- `GET /api/chats/:chatId` — Get a specific chat and paginated messages. Query params: `page`, `limit`.
- `POST /api/chats/private/:userId` — Create or get a private chat with `:userId` (returns messages and chat meta).
- `POST /api/chats/:chatId/messages` — Send a message to a chat. Body: `{ text, replyTo, attachments }`.
- `PUT /api/chats/:chatId/read` — Mark messages as read. Body: `{ messageIds }`.
- `PUT /api/chats/:chatId/delivered` — Mark messages as delivered. Body: `{ messageIds }`.
- `DELETE /api/chats/:chatId/messages/:messageId` — Soft-delete a message (owner only).
- `PUT /api/chats/:chatId/pin` — Pin/unpin a chat. Body: `{ pin: true|false }`.
- `PUT /api/chats/:chatId/mute` — Mute/unmute a chat. Body: `{ mute: true|false, until: Date (optional) }`.
- `DELETE /api/chats/:chatId` — Archive (soft-delete) chat for the logged-in user.
- `DELETE /api/chats/:chatId/delete` — Permanently delete a chat (server-side removal).
- `POST /api/chats/group` — Create a group chat. Body: `{ name, participantIds, avatar }`.

Notes:
- All chat HTTP endpoints require authentication (JWT). The project accepts the token in cookies or `Authorization: Bearer <token>` header.
- Message creation supports `attachments` array (image/video/document/audio) and `replyTo` for threading.
- Responses include helpful fields: `lastMessage`, `unreadCount`, `isPinned`, `isMuted`, and `connectionStatus` for private chats.

### Examples
Create/get private chat (cURL):
```bash
curl -X POST http://localhost:3000/api/chats/private/<USER_ID> \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

Send message (cURL):
```bash
curl -X POST http://localhost:3000/api/chats/<CHAT_ID>/messages \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"text":"Hello!"}'
```

## 🔌 Socket (Realtime) Events

The backend exposes Socket.IO realtime events to support typing indicators, optimistic UI, delivery/read receipts, and presence.

Authentication:
- Provide a valid JWT when establishing the socket connection. The server accepts the token via `socket.handshake.auth.token`, `Authorization: Bearer <token>` header, or `cookie` header containing `token=`.

Client-side events (emit):
- `join-chat-room` — Join a chat room: payload `chatId`.
- `leave-chat-room` — Leave a chat room: payload `chatId`.
- `send-message` — Send a chat message: `{ chatId, text, replyTo, tempId }`.
- `typing-start` / `typing-end` — Typing indicators: `{ chatId, toUserId? }`.
- `mark-read` — Mark messages read: `{ chatId, messageIds }`.
- `delete-message` — Delete a message: `{ chatId, messageId }`.
- `get-user-status` — Request a user's online status: payload is `userId`.

Server-side events (listen):
- `message-sent` — Confirmation that a message was saved (returns full message data).
- `message-error` — Error while sending message (includes `tempId` for client reconciliation).
- `new-private-message` / `new-global-message` — New message delivered to recipients.
- `message-update` — Chat-level update (useful for refreshing chat list/unread counts).
- `user-typing` — Typing indicator from other users.
- `messages-read` — Notification that messages were read by recipient(s).
- `message-deleted` — Notification for deleted messages.
- `user-online` / `user-offline` — Presence notifications.

Tips:
- Use `tempId` from the client for optimistic UI; the server returns `tempId` in confirmations to reconcile states.
- Rooms naming used by the server: `chat_<CHAT_ID>` for chat rooms and `user_<USER_ID>` for per-user sockets.

## ✨ New Chat Features (Highlights)

- Full chat system with private & group chats, message attachments, read/delivered receipts, and optimistic UI support.
- Message soft-delete with preserved conversation context and last-message fallback text.
- Pin / Mute / Archive conversations per-user.
- Bulk mark-as-read and mark-as-delivered endpoints for synchronization.
- Socket.IO-based presence and typing indicators, with multiple token intake methods for flexibility.
- Group creation endpoint with auto-generated avatar fallback.
