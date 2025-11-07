# MockMate – Your AI Interview Coach

An AI-powered mock interview coach that helps you prepare for behavioral interviews by generating tailored questions and providing feedback on your answers.

## 🎯 Features

- **Resume-based Question Generation**: Upload or paste your resume text
- **Role-specific Questions**: Enter company name and role title for tailored questions
- **AI-powered Feedback**: Get instant feedback on clarity, confidence, and structure (STAR method)
- **Clean, Modern UI**: Built with React, Vite, and Tailwind CSS

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone the repository** (or navigate to the project directory)

2. **Set up the Backend:**
   ```bash
   cd backend
   npm install
   cp env.example .env
   # Edit .env and add your API keys
   npm start
   ```

3. **Set up the Frontend** (in a new terminal):
   ```bash
   cd Frontend
   npm install
   npm run dev
   ```

4. **Open your browser** and navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
deltahackslite/
├── Frontend/          # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadResume.jsx
│   │   │   ├── JobInfoForm.jsx
│   │   │   ├── QuestionDisplay.jsx
│   │   │   └── FeedbackDisplay.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── backend/           # Node.js + Express backend
│   ├── server.js
│   └── package.json
└── README.md
```

## 🧠 How It Works

1. **Upload Resume**: User pastes their resume text
2. **Enter Job Info**: User provides company name and role title
3. **Generate Questions**: Backend calls OpenAI GPT-4 to generate 3 tailored behavioral interview questions
4. **Answer Questions**: User types their answers
5. **Get Feedback**: Backend calls Google Gemini API to analyze answers and provide structured feedback

## 🔧 Development

### Frontend Development
```bash
cd Frontend
npm run dev
```

### Backend Development
```bash
cd backend
npm run dev  # Uses nodemon for auto-reload
```

## 📝 Environment Variables

Create a `.env` file in the `backend` directory:

```env
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
```

## 🛠️ Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS

### Backend
- Node.js
- Express.js
- OpenAI API (GPT-4)
- Google Gemini API

## 📄 License

ISC

