# MockMate Backend

Node.js/Express backend server with OpenAI and Gemini AI integrations.

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key (for generating interview questions)
- Google Gemini API key (for analyzing answers)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
   - Copy `env.example` to `.env`
   - Add your API keys:
     ```
     OPENAI_API_KEY=your_openai_api_key_here
     GEMINI_API_KEY=your_gemini_api_key_here
     PORT=5000
     ```

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The server will run on [http://localhost:5000](http://localhost:5000)

### API Endpoints

- `GET /` - Welcome message
- `GET /api/health` - Health check endpoint
- `POST /api/generateQuestions` - Generate interview questions
  - Body: `{ resumeText: string, company: string, role: string }`
  - Returns: `{ questions: string[] }`
- `POST /api/analyzeAnswer` - Analyze answer and provide feedback
  - Body: `{ question: string, answer: string }`
  - Returns: `{ feedback: string[] }`

### Tech Stack

- **Express.js** - Web framework
- **OpenAI API** - GPT-4 for generating interview questions
- **Google Gemini API** - For analyzing answers and providing feedback
