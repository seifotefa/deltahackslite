import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY not set');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function listModels() {
  try {
    const models = await genAI.listModels();
    console.log('Available models:');
    models.forEach(model => {
      console.log(`- ${model.name}`);
    });
  } catch (error) {
    console.error('Error listing models:', error.message);
    
    // Try to use a model directly
    console.log('\nTrying common model names...');
    const commonModels = ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-latest'];
    
    for (const modelName of commonModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        console.log(`✓ ${modelName} - Available`);
      } catch (e) {
        console.log(`✗ ${modelName} - Not available: ${e.message}`);
      }
    }
  }
}

listModels();


