import Groq from 'groq-sdk';

const apiKey = process.env.GROQ_API_KEY;

// Initialize Groq client only if API key is provided
export const groq = apiKey && apiKey !== 'your_groq_api_key_here' ? new Groq({ apiKey }) : null;

export const isAiEnabled = () => !!groq;
