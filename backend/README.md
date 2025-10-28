# AI Vision Exam Backend

A comprehensive Node.js/Express backend for the AI Vision Exam monitoring system with facial recognition, real-time monitoring, and exam management capabilities.

## Features

### 🔐 Authentication & Authorization

- JWT-based authentication
- Role-based access control (Admin, Invigilator, Student)
- Secure password hashing with bcrypt
- Password reset functionality
- Refresh token support

### 👤 User Management

- User registration and profile management
- Student ID verification
- Role-based permissions
- User status management
- Profile image upload

### 📝 Exam Management

- Exam creation and scheduling
- Student enrollment management
- Exam status tracking (scheduled, ongoing, completed)
- Exam settings configuration
- Real-time exam control

### 🎥 Face Recognition & Verification

- Face registration for students
- Real-time face verification during exams
- Identity verification before exam start
- Face comparison algorithms
- Multiple face detection

### 📊 Real-time Monitoring

- Live exam monitoring dashboard
- Real-time violation detection
- Student activity tracking
- Automatic session management
- Socket.IO for real-time updates

### 🚨 Violation Detection & Reporting

- Multiple violation types detection
- Severity-based classification
- Automatic violation logging
- Real-time alerts
- Risk score calculation

### 📈 Analytics & Reports

- Comprehensive exam analytics
- Student verification status tracking
- Violation statistics
- Risk assessment reports
- Dashboard with live metrics

## Technology Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT (JSON Web Tokens)
- **Real-time:** Socket.IO
- **File Upload:** Multer
- **Validation:** Express-validator
- **Security:** Helmet, bcryptjs, CORS
- **Email:** Nodemailer

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (v5 or higher)
- npm or yarn package manager

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd ai-vision-exam/backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` file with your configuration:

   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/ai-vision-exam
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:5000`

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register

Register a new user

```json
{
  "email": "student@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student",
  "studentId": "STU001"
}
```

#### POST /api/auth/login

Login user

```json
{
  "email": "student@example.com",
  "password": "password123"
}
```

### Exam Management Endpoints

#### GET /api/exam

Get all exams (Admin/Invigilator)

#### POST /api/exam

Create new exam (Admin)

```json
{
  "title": "Mathematics Final Exam",
  "subject": "Mathematics",
  "course": "MATH101",
  "startTime": "2024-12-20T10:00:00Z",
  "endTime": "2024-12-20T12:00:00Z",
  "duration": 120,
  "maxMarks": 100,
  "passingMarks": 40
}
```

#### POST /api/exam/student/join/:examCode

Join exam with code (Student)

### Monitoring Endpoints

#### GET /api/dashboard/stats

Get dashboard statistics (Admin/Invigilator)

#### GET /api/dashboard/live-monitoring

Get live monitoring data (Admin/Invigilator)

#### POST /api/verification/face/verify

Verify face during exam

```json
{
  "sessionId": "session-uuid",
  "image": "base64-image-data"
}
```

### User Management Endpoints

#### GET /api/user

Get all users (Admin/Invigilator)

#### PUT /api/user/:id/verification

Update verification status (Admin)

```json
{
  "verificationStatus": "verified"
}
```

## Database Schema

### User Model

```javascript
{
  email: String,
  password: String,
  firstName: String,
  lastName: String,
  role: ['admin', 'invigilator', 'student'],
  studentId: String,
  verificationStatus: ['pending', 'verified', 'rejected'],
  faceData: String, // Encoded face descriptor
  profileImage: String,
  isActive: Boolean
}
```

### Exam Model

```javascript
{
  title: String,
  subject: String,
  course: String,
  examCode: String,
  startTime: Date,
  endTime: Date,
  duration: Number,
  status: ['scheduled', 'ongoing', 'completed', 'cancelled'],
  enrolledStudents: [{ student: ObjectId, status: String }],
  examSettings: {
    faceVerificationRequired: Boolean,
    continuousMonitoring: Boolean,
    tabSwitchLimit: Number
  }
}
```

### MonitoringSession Model

```javascript
{
  exam: ObjectId,
  student: ObjectId,
  sessionId: String,
  status: ['active', 'paused', 'completed', 'terminated'],
  faceVerifications: [{
    timestamp: Date,
    result: String,
    confidence: Number
  }],
  violations: [{
    type: String,
    severity: ['low', 'medium', 'high', 'critical'],
    timestamp: Date,
    description: String
  }],
  finalReport: {
    riskScore: Number,
    recommendation: ['accept', 'review', 'reject']
  }
}
```

## Real-time Events (Socket.IO)

### Student Events

- `joinExamSession` - Join an exam session
- `liveFaceVerification` - Real-time face verification
- `reportViolation` - Report a violation
- `tabSwitch` - Tab switching detection

### Monitoring Events

- `studentJoinedExam` - Student joined exam
- `violationAlert` - Violation detected
- `sessionStatusChanged` - Session status updated
- `faceVerificationResult` - Face verification result

## Security Features

- **JWT Authentication:** Secure token-based authentication
- **Rate Limiting:** Prevent API abuse
- **CORS Protection:** Cross-origin request security
- **Helmet:** Security headers
- **Input Validation:** Comprehensive input validation
- **Password Hashing:** Secure password storage with bcrypt

## Error Handling

The API uses consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"]
}
```

## Development

### Running Tests

```bash
npm test
```

### Code Formatting

```bash
npm run format
```

### Environment Variables

See `.env.example` for all available configuration options.

## Deployment

### Production Setup

1. Set `NODE_ENV=production`
2. Use environment variables for all secrets
3. Set up MongoDB replica set for production
4. Configure email service for notifications
5. Set up proper logging
6. Configure reverse proxy (nginx)

### Docker Deployment

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## License

MIT License - see LICENSE file for details.
