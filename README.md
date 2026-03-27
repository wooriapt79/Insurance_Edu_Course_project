# Mulberry Intelligence Academy & Certification Platform (V2.0)

### Standardizing AI Agent Competency for Regulated Industries.

![Mulberry Logo](mulberry_logo.png)

[![English](https://img.shields.io/badge/Language-English-blue?style=flat-square)](README_en.md) [![Korean](https://img.shields.io/badge/Language-Korean-red?style=flat-square)](README_ko.md) [![Vietnamese](https://img.shields.io/badge/Language-Vietnamese-green?style=flat-square)](README_vi.md)

[![Hugging Face Spaces](https://img.shields.io/badge/Hugging_Face-Spaces-blue?style=flat-square&logo=huggingface&logoColor=white)](https://huggingface.co/spaces/re-eul/mulberry-demo) [![Server Status](https://img.shields.io/badge/Server-Live-brightgreen?style=flat-square)](https://mulberry-open-api-production.up.railway.app/)


This project provides a backend API for an education and certification platform tailored for AI agents. It allows for the creation and management of educational courses, conducting certification exams, tracking agent performance, and issuing certifications.

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
  - [Public API](#public-api)
  - [Authenticated API](#authenticated-api)
  - [Admin API](#admin-api)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Course Management**: Create, view, and manage education courses.
- **Certification Exams**: Administer exams with various question types (multiple-choice, text, boolean).
- **Automated Grading**: Automatic scoring of submitted exams, including support for partial scores and AI agent confidence levels.
- **Skill Tracking**: Associate courses with specific skills and track user (AI agent) proficiency.
- **Certification Issuance**: Issue and manage digital certifications upon successful completion of exams.
- **User/Role Management**: Basic user authentication and role-based access control (e.g., 'user', 'CEO', 'Core Team').
- **Notifications**: System for sending notifications for certification achievements.
- **AI Learning Data**: Incorporates fields for tracking AI agent learning patterns (time spent, raw responses, confidence).

## Strategic Value for Insurance & Healthcare

This platform goes beyond simple testing; it serves as a **Regulatory Moat** for AI deployment:

- **Certified Curation**: Only agents with a verified license can access sensitive product data or interact with customers.
- **Risk Mitigation**: Automated grading includes 'Ethics & Compliance' checks to prevent mis-selling by AI.
- **Proof of Intelligence**: Tracks learning patterns and decision-making confidence to provide a transparent audit trail for regulators.

## Project Structure

The project follows a modular structure to ensure maintainability and scalability:

```
.editorconfig
.gitignore
app.js
package.json
package-lock.json
README.md
├── middleware/
│   └── auth.js
├── models/
│   ├── CertificationAttempt.js
│   ├── EducationCourse.js
│   ├── Notification.js
│   ├── Skill.js
│   ├── User.js
│   └── UserSkill.js
└── routes/
    └── education.js
```

- **`app.js`**: The main entry point of the Express application. It sets up the server, connects to MongoDB, and registers the API routes.
- **`package.json`**: Defines project metadata, scripts, and dependencies.
- **`middleware/`**: Contains Express middleware functions, such as authentication (`auth.js`).
- **`models/`**: Defines Mongoose schemas for various data entities (e.g., `EducationCourse`, `CertificationAttempt`, `User`, `Skill`).
- **`routes/`**: Contains Express route definitions, organizing API endpoints by feature (`education.js`).

## Getting Started

To set up and run this project locally, follow these steps:

### Prerequisites

- **Node.js**: [LTS version recommended](https://nodejs.org/en/download/)
- **npm** (Node Package Manager): Comes with Node.js
- **MongoDB**: A running MongoDB instance (e.g., local installation, Docker, MongoDB Atlas).

### Installation

1. **Clone the repository**:
   
   ```bash
   git clone <your-repository-url>
   cd education-platform
   ```
2. **Install dependencies**:
   
   ```bash
   npm install
   ```

### Environment Variables

Create a `.env` file in the root directory of the project and add the following environment variables:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/educationPlatform
JWT_SECRET=your_jwt_secret_key # Replace with a strong, random key
```

- `PORT`: The port on which the Express server will run.
- `MONGODB_URI`: The connection string for your MongoDB database.
- `JWT_SECRET`: A secret key for signing and verifying JSON Web Tokens (JWTs). (Note: The provided `auth.js` has a placeholder; a real implementation would use this variable).

### Running the Application

- **Start the server in development mode (with nodemon)**:
  
  ```bash
  npm run dev
  ```
  
  `nodemon` will automatically restart the server when file changes are detected.

- **Start the server in production mode**:
  
  ```bash
  npm start
  ```

## API Endpoints

### Public API (No Authentication Required)

- `GET /api/education/courses`: Get a list of all active education courses.
- `GET /api/education/courses/:id`: Get details of a specific education course.

### Authenticated API (JWT Required)

- `POST /api/education/courses/:id/start`: Start a new certification exam attempt for a course.
- `POST /api/education/attempts/:attemptId/submit`: Submit answers for an exam attempt and get results.
- `GET /api/education/my-certifications`: Get a list of certifications obtained by the authenticated user.
- `GET /api/education/certificates/:certNumber`: Get details of a specific certificate.

### Admin API (Roles: 'CEO', 'Core Team')

- `POST /api/education/courses`: Create a new education course.

### Example Curl Commands

(Note: Replace `{ceo_token}`, `{user_token}`, `{course_id}`, `{attempt_id}`, `{question_id_1}`, `{question_id_2}`, `{skill_id}` with actual values)

#### Create Course (Admin/CEO)

```bash
curl -X POST http://localhost:3000/api/education/courses \
  -H "Authorization: Bearer {ceo_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "보험 판매 자격 과정",
    "description": "ABC보험사의 공식 교육 과정입니다. 시험 합격 시 보험 판매 라이선스가 발급됩니다.",
    "provider": "insurance",
    "providerName": "ABC보험",
    "category": "insurance",
    "exam": {
      "passingScore": 70,
      "timeLimit": 30,
      "questions": [
        {
          "question": "보험 계약 시 고지의무 위반 시 발생할 수 있는 결과는?",
          "type": "multiple-choice",
          "options": ["계약 취소", "보험금 삭감", "계약 유지", "모두 가능"],
          "correctAnswerIndex": 3,
          "difficulty": "medium",
          "topics": ["보험계약", "의무위반"],
          "points": 2,
          "explanation": "고지의무 위반 시 보험 계약이 해지되거나 보험금 지급이 거절될 수 있습니다."
        }
      ]
    },
    "skillGranted": "{skill_id}",
    "validPeriod": 365,
    "thumbnail": "https://example.com/insurance-course.jpg"
  }'
```

#### Start Exam (Authenticated User)

```bash
curl -X POST http://localhost:3000/api/education/courses/{course_id}/start \
  -H "Authorization: Bearer {user_token}" \
  -H "Content-Type: application/json"
```

#### Submit Exam (Authenticated User)

```bash
curl -X POST http://localhost:3000/api/education/attempts/{attempt_id}/submit \
  -H "Authorization: Bearer {user_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      {
        "questionId": "{question_id_1}",
        "answer": 3,
        "timeSpentSeconds": 30,
        "rawResponse": "고지의무 위반 시 보험 계약이 취소될 수 있습니다.",
        "agentConfidence": 95,
        "partialScore": 2
      },
      {
        "questionId": "{question_id_2}",
        "answer": "약관",
        "timeSpentSeconds": 15,
        "rawResponse": "보험 약관을 상세히 설명해야 합니다.",
        "agentConfidence": 80
      }
    ]
  }'
```

#### Get My Certifications (Authenticated User)

```bash
curl -X GET http://localhost:3000/api/education/my-certifications \
  -H "Authorization: Bearer {user_token}"
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and ensure they adhere to the project's coding style.
4. Write or update tests as appropriate.
5. Submit a pull request.

## ⚖️ License & Ownership

Copyright © 2026 **Mulberry Project (re.eul)**. All rights reserved. *This system is a proprietary intelligence infrastructure of the Mulberry Community Control Center (MCCC).*

# Insurance_Edu_Course_project
Mulberry Intelligence Academy &amp; Certification Platform (V2.0) Standardizing AI Agent Competency for Regulated Industries
