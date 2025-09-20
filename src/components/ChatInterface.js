import React, { useState, useRef, useEffect } from 'react';
import { 
  Paper, Box, Typography, TextField, Button, 
  CircularProgress, Accordion, AccordionSummary, 
  AccordionDetails, Chip
} from '@mui/material';
import { processUserQuery } from '../utils/nlp';
import { executeCloudflareFunctions } from '../utils/cloudflare';

const ChatInterface = ({ cloudflareToken, openaiKey, userInfo = null }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Add welcome message when component mounts
  useEffect(() => {
    if (userInfo && messages.length === 0) {
      const welcomeMessage = `Welcome, ${userInfo.email || 'User'}! I'm your Cloudflare AI assistant.
      
You can interact with your Cloudflare account using natural language. Here are some things you can ask me to do:

• List your websites/zones
• Show DNS records for a specific domain
• Create or update DNS records
• Toggle development mode
• Purge cache for a site
• Check firewall rules
• View account details

Just ask in plain English, and I'll translate your request into the appropriate Cloudflare API calls.`;
      addMessage(welcomeMessage, 'assistant');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const addMessage = (content, sender, rawData = null) => {
    setMessages(prev => [...prev, { 
      id: Date.now(), 
      content, 
      sender, 
      timestamp: new Date(),
      rawData
    }]);
  };
  
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    setInput('');
    addMessage(userMessage, 'user');
    setLoading(true);
    
    try {
      // First, process the natural language query
      addMessage("Processing your request...", "assistant");
      
      const processedQuery = await processUserQuery(userMessage, openaiKey);
      
      // Check if there's an error message from the NLP processing
      if (processedQuery.error) {
        setMessages(prev => {
          const newMessages = [...prev];
          const processingMsgIndex = newMessages.length - 1;
          newMessages[processingMsgIndex] = {
            ...newMessages[processingMsgIndex],
            content: `I understand you want to ${processedQuery.intent || 'perform an action'}, but: ${processedQuery.error}`,
          };
          return newMessages;
        });
        setLoading(false);
        return; // Don't proceed with API call if there's an error
      }
      
      // Update the processing message with the interpretation
      setMessages(prev => {
        const newMessages = [...prev];
        const processingMsgIndex = newMessages.length - 1;
        newMessages[processingMsgIndex] = {
          ...newMessages[processingMsgIndex],
          content: `I understand you want to ${processedQuery.intent || 'perform an action'}. Here's what I'm doing:`,
        };
        return newMessages;
      });
      
      // Ensure we have all required values for the API call
      const apiMethod = processedQuery.apiMethod || 'GET';
      const endpoint = processedQuery.endpoint || '/user';
      const params = processedQuery.params || {};
      
      // Execute the Cloudflare API request
      const result = await executeCloudflareFunctions(
        apiMethod,
        endpoint,
        params,
        cloudflareToken
      );
      
      // Import the formatter on demand to avoid circular dependencies
      const { formatCloudflareResponse } = await import('../utils/formatters');
      
      // Format the Cloudflare response in a more human-readable way
      const formattedResponse = formatCloudflareResponse(result);
        
      // Add the message with both formatted response and raw data
      addMessage(formattedResponse, 'cloudflare', result);
      
      // Add a summary of what was done
      addMessage(
        processedQuery.summary || `I've completed your request to ${processedQuery.intent || 'access Cloudflare data'}.`, 
        'assistant'
      );
      
    } catch (error) {
      console.error('Error processing request:', error);
      
      // Provide more helpful error messages based on error type
      if (error.message.includes('No response received')) {
        addMessage(
          `Sorry, I couldn't connect to the Cloudflare API. This could be due to network issues or incorrect API credentials. Please check your network connection and try again.`,
          'assistant'
        );
      } else if (error.message.includes('timeout')) {
        addMessage(
          `The request to Cloudflare timed out. This might be due to Cloudflare's API being slow to respond or network connectivity issues. Please try again in a moment.`,
          'assistant'
        );
      } else if (error.message.includes('Cloudflare API error')) {
        addMessage(
          `There was an error from Cloudflare's API: ${error.message}. Please verify your API credentials and permissions.`,
          'assistant'
        );
      } else {
        addMessage(
          `Sorry, I encountered an error: ${error.message}`,
          'assistant'
        );
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Paper elevation={3} className="chat-container">
      <Box className="messages-container">
        {messages.length === 0 && (
          <Box sx={{ textAlign: 'center', color: 'text.secondary', my: 4 }}>
            <Typography variant="body1">
              Ask anything about your Cloudflare account using natural language.
            </Typography>
            <Typography variant="body2" sx={{ mt: 2 }}>
              Examples:
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Chip 
                label="List all my websites" 
                onClick={() => setInput("List all my websites")}
                clickable
                color="primary"
                variant="outlined"
                sx={{ mb: 1 }}
              />
              <Chip 
                label="Show DNS records for example.com" 
                onClick={() => setInput("Show DNS records for example.com")}
                clickable
                color="primary"
                variant="outlined"
                sx={{ mb: 1 }}
              />
              <Chip 
                label="Turn on development mode for my site" 
                onClick={() => setInput("Turn on development mode for my site")}
                clickable
                color="primary"
                variant="outlined"
                sx={{ mb: 1 }}
              />
              <Chip 
                label="Add an A record for blog.example.com" 
                onClick={() => setInput("Add an A record for blog.example.com pointing to 1.2.3.4")}
                clickable
                color="primary"
                variant="outlined"
                sx={{ mb: 1 }}
              />
              <Chip 
                label="Purge cache for example.com" 
                onClick={() => setInput("Purge the cache for example.com")}
                clickable
                color="primary"
                variant="outlined"
                sx={{ mb: 1 }}
              />
              <Chip 
                label="Check my account details" 
                onClick={() => setInput("What are my account details?")}
                clickable
                color="primary"
                variant="outlined"
                sx={{ mb: 1 }}
              />
            </Box>
          </Box>
        )}
        
        {messages.map((message) => (
          <Box
            key={message.id}
            className={`message message-${message.sender}`}
          >
            <Typography variant="body1">{message.content}</Typography>
            
            {message.sender === 'cloudflare' && message.rawData && (
              <Accordion sx={{ mt: 1, bgcolor: 'transparent' }}>
                <AccordionSummary>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption">View raw response</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <pre className="json-display">
                    {JSON.stringify(message.rawData, null, 2)}
                  </pre>
                </AccordionDetails>
              </Accordion>
            )}
            
            <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
              {formatTimestamp(message.timestamp)}
            </Typography>
          </Box>
        ))}
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </Box>
      
      <Box className="input-container">
        <TextField
          className="input-field"
          placeholder="Ask about your Cloudflare account..."
          multiline
          maxRows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          variant="outlined"
          size="small"
        />
        <Button 
          color="primary" 
          onClick={handleSendMessage} 
          disabled={!input.trim() || loading}
          variant="contained"
          size="small"
        >
          Send
        </Button>
      </Box>
    </Paper>
  );
};

export default ChatInterface;