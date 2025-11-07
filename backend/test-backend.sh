#!/bin/bash

# Backend API Test Script
# Make sure the backend is running on port 5001

BASE_URL="http://localhost:5001"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testing MockMate Backend API"
echo "=============================="
echo ""

# Test 1: Root endpoint
echo "1️⃣  Testing GET /"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓${NC} GET / - Status: $http_code"
    echo "   Response: $body"
else
    echo -e "${RED}✗${NC} GET / - Status: $http_code"
fi
echo ""

# Test 2: Health check
echo "2️⃣  Testing GET /api/health"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓${NC} GET /api/health - Status: $http_code"
    echo "   Response: $body"
else
    echo -e "${RED}✗${NC} GET /api/health - Status: $http_code"
fi
echo ""

# Test 3: Upload resume (requires PDF file)
echo "3️⃣  Testing POST /api/upload-resume"
echo -e "${YELLOW}⚠${NC}  This requires a PDF file. To test manually:"
echo "   curl -X POST -F 'resume=@/path/to/resume.pdf' $BASE_URL/api/upload-resume"
echo ""

# Test 4: Generate questions (requires sessionId)
echo "4️⃣  Testing POST /api/generate-questions"
echo -e "${YELLOW}⚠${NC}  This requires a valid sessionId. To test manually:"
echo "   curl -X POST -H 'Content-Type: application/json' \\"
echo "        -d '{\"sessionId\":\"your-session-id\",\"company\":\"Apple\",\"role\":\"Software Engineer\"}' \\"
echo "        $BASE_URL/api/generate-questions"
echo ""

# Test 5: Submit answer (requires sessionId and audio file)
echo "5️⃣  Testing POST /api/answer"
echo -e "${YELLOW}⚠${NC}  This requires a valid sessionId and audio file. To test manually:"
echo "   curl -X POST -F 'sessionId=your-session-id' \\"
echo "        -F 'questionIndex=0' \\"
echo "        -F 'question=Your question here' \\"
echo "        -F 'audio=@/path/to/audio.webm' \\"
echo "        $BASE_URL/api/answer"
echo ""

echo "=============================="
echo "✅ Basic tests complete!"
echo ""
echo "To test with actual files, use the commands above or test through the frontend."


