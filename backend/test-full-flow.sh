#!/bin/bash

# Full Flow Test Script
# Tests the complete backend flow: upload → generate → answer

BASE_URL="http://localhost:5001"
RESUME_PATH="/Users/youseph.e/Desktop/deltahacks/Youseph_El_Khouly_Resume.pdf"

echo "🧪 Testing Full Backend Flow"
echo "=============================="
echo ""

# Step 1: Upload Resume
echo "1️⃣  Uploading Resume..."
UPLOAD_RESPONSE=$(curl -s -X POST -F "resume=@$RESUME_PATH" "$BASE_URL/api/upload-resume")
SESSION_ID=$(echo "$UPLOAD_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['sessionId'])" 2>/dev/null)

if [ -z "$SESSION_ID" ]; then
    echo "❌ Failed to upload resume"
    echo "Response: $UPLOAD_RESPONSE"
    exit 1
fi

echo "✅ Resume uploaded successfully"
echo "   Session ID: $SESSION_ID"
echo ""

# Step 2: Generate Questions
echo "2️⃣  Generating Questions..."
QUESTIONS_RESPONSE=$(curl -s -X POST \
  -H 'Content-Type: application/json' \
  -d "{\"sessionId\":\"$SESSION_ID\",\"company\":\"Apple\",\"role\":\"Software Engineer\"}" \
  "$BASE_URL/api/generate-questions")

if echo "$QUESTIONS_RESPONSE" | grep -q "error"; then
    echo "❌ Failed to generate questions"
    echo "Response: $QUESTIONS_RESPONSE"
    echo ""
    echo "⚠️  This might be due to:"
    echo "   - Invalid GEMINI_API_KEY"
    echo "   - Gemini API error"
    echo "   - Check server logs for details"
    exit 1
fi

echo "✅ Questions generated successfully"
echo "$QUESTIONS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$QUESTIONS_RESPONSE"
echo ""

echo "=============================="
echo "✅ Upload and Question Generation tests complete!"
echo ""
echo "To test audio submission, you'll need to:"
echo "1. Record an audio file (WebM format)"
echo "2. Use the sessionId: $SESSION_ID"
echo "3. Run: curl -X POST -F 'sessionId=$SESSION_ID' -F 'questionIndex=0' -F 'question=Your question' -F 'audio=@audio.webm' $BASE_URL/api/answer"


