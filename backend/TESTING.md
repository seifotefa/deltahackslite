# Backend API Testing Guide

## Quick Test Results
✅ **GET /** - Working (200 OK)
✅ **GET /api/health** - Working (200 OK)

## Testing the Full Flow

### 1. Test PDF Upload (Step 1)

```bash
# Replace with path to an actual PDF file
curl -X POST \
  -F 'resume=@/path/to/your/resume.pdf' \
  http://localhost:5001/api/upload-resume
```

**Expected Response:**
```json
{
  "sessionId": "uuid-here",
  "resumePreview": "First 600 chars of extracted text...",
  "pages": 2
}
```

**Save the `sessionId` for next steps!**

---

### 2. Test Question Generation (Step 2)

```bash
# Replace SESSION_ID with the sessionId from step 1
curl -X POST \
  -H 'Content-Type: application/json' \
  -d '{
    "sessionId": "SESSION_ID",
    "company": "Apple",
    "role": "Software Engineer"
  }' \
  http://localhost:5001/api/generate-questions
```

**Expected Response:**
```json
{
  "questions": [
    "Question 1...",
    "Question 2...",
    "Question 3..."
  ]
}
```

---

### 3. Test Audio Answer Submission (Step 3)

**First, you need to record an audio file (WebM format recommended):**

```bash
# Replace SESSION_ID and paths with actual values
curl -X POST \
  -F 'sessionId=SESSION_ID' \
  -F 'questionIndex=0' \
  -F 'question=Tell me about a time you worked in a team...' \
  -F 'audio=@/path/to/your/audio.webm' \
  http://localhost:5001/api/answer
```

**Expected Response:**
```json
{
  "transcript": "Transcribed text of your answer...",
  "score": 7.5,
  "feedback": [
    "Feedback point 1",
    "Feedback point 2",
    "Feedback point 3"
  ]
}
```

---

## Testing Through the Frontend

The easiest way to test the full flow:

1. **Start the frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Start the backend** (if not already running):
   ```bash
   cd backend
   npm run dev
   ```

3. **Open browser:** http://localhost:3000

4. **Test the flow:**
   - Upload a PDF resume
   - Enter company and role
   - Record audio answers for each question
   - View transcripts and feedback

---

## Error Testing

### Test Invalid PDF Upload
```bash
# Upload a non-PDF file
curl -X POST \
  -F 'resume=@/path/to/text.txt' \
  http://localhost:5001/api/upload-resume
```
**Expected:** `400 Bad Request` with error message

### Test Missing Fields
```bash
# Missing sessionId
curl -X POST \
  -H 'Content-Type: application/json' \
  -d '{"company":"Apple","role":"Engineer"}' \
  http://localhost:5001/api/generate-questions
```
**Expected:** `400 Bad Request` with validation error

### Test Invalid SessionId
```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"invalid-uuid","company":"Apple","role":"Engineer"}' \
  http://localhost:5001/api/generate-questions
```
**Expected:** `400 Bad Request` with "Invalid sessionId"

---

## Using Postman or Insomnia

1. **Import these endpoints:**
   - `POST http://localhost:5001/api/upload-resume` (multipart/form-data)
   - `POST http://localhost:5001/api/generate-questions` (JSON)
   - `POST http://localhost:5001/api/answer` (multipart/form-data)

2. **Set headers:**
   - For JSON: `Content-Type: application/json`
   - For multipart: Let the tool set it automatically

---

## Check Server Logs

The backend uses `morgan` for logging, so you'll see:
- Request method and path
- Response status
- Response time

Watch the terminal where `npm run dev` is running to see all requests.


