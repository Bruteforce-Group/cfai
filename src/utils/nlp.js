import axios from 'axios';
import { OPENAI_API_BASE, API_TIMEOUTS } from './api';

// Process user query using OpenAI's API via our secure proxy
export const processUserQuery = async (query, openaiKey) => {
  try {
    console.log('Sending query to proxy server:', query.substring(0, 30) + '...');
    
    // Make request to our proxy server that securely handles the OpenAI API
    const response = await axios.post(OPENAI_API_BASE, {
      // Add request ID to help with debugging
      requestId: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      query,
      apiKey: openaiKey
    });

    // The proxy server already parsed the JSON
    return response.data;
  } catch (error) {
    console.error('Error processing natural language query:', error);
    
    if (error.response) {
      // The server responded with an error
      console.error('Server error details:', error.response.data);
      throw new Error(error.response.data.details || 'Server error processing your request');
    } else if (error.request) {
      // The request was made but no response received (network error)
      throw new Error('Unable to reach the AI service. Please check your network connection and ensure the proxy server is running.');
    } else {
      // Something else went wrong
      throw new Error('Failed to process your request. Please try again with different wording.');
    }
  }
};