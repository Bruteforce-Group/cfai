import React, { useState, useEffect } from 'react';
import { 
  Container, Box, Typography, Button, 
  CircularProgress, AppBar, Toolbar, 
  Alert
} from '@mui/material';
import ChatInterface from './components/ChatInterface';
import SetupForm from './components/SetupForm';
import { checkApiCredentials } from './utils/api';
import { getAPIInfo } from './utils/cloudflare';
import './App.css';

function App() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cloudflareToken, setCloudflareToken] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if API credentials are stored
    const storedCloudflareToken = localStorage.getItem('cloudflareToken');
    const storedOpenaiKey = localStorage.getItem('openaiKey');
    
    if (storedCloudflareToken && storedOpenaiKey) {
      setCloudflareToken(storedCloudflareToken);
      setOpenaiKey(storedOpenaiKey);
      
      // Try to parse the token if it's JSON
      let credential = storedCloudflareToken;
      try {
        // Check if it's a JSON string
        if (typeof storedCloudflareToken === 'string' && 
           (storedCloudflareToken.startsWith('{') || storedCloudflareToken.includes('"type"'))) {
          credential = JSON.parse(storedCloudflareToken);
        }
      } catch (e) {
        console.warn('Failed to parse stored credential', e);
      }
      
      // Test credentials and fetch initial user info
      checkApiCredentials(credential, storedOpenaiKey)
        .then(result => {
          if (result.cloudflareSuccess && result.openaiSuccess) {
            setIsConfigured(true);
            setUserInfo(result.userInfo);
            
            // Also fetch API info
            getAPIInfo(credential)
              .then(apiInfo => {
                setUserInfo(apiInfo.user);
              })
              .catch(err => {
                console.error('Error fetching API info:', err);
              });
          } else {
            setError('Stored credentials are no longer valid. Please log in again.');
            localStorage.removeItem('cloudflareToken');
            localStorage.removeItem('openaiKey');
          }
          setLoading(false);
        })
        .catch(() => {
          setError('Error validating stored credentials');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleSetupComplete = (credentials) => {
    setCloudflareToken(credentials.cloudflareToken);
    setOpenaiKey(credentials.openaiKey);
    
    // Store credentials (securely in localStorage for demo)
    localStorage.setItem('cloudflareToken', credentials.cloudflareToken);
    localStorage.setItem('openaiKey', credentials.openaiKey);
    
    setIsConfigured(true);
    setError('');
  };

  const handleLogout = () => {
    localStorage.removeItem('cloudflareToken');
    localStorage.removeItem('openaiKey');
    setCloudflareToken('');
    setOpenaiKey('');
    setUserInfo(null);
    setIsConfigured(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div className="app">
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            CloudflareAI
          </Typography>
          {userInfo && (
            <Typography variant="body2" color="inherit" sx={{ mr: 2 }}>
              {userInfo.email}
            </Typography>
          )}
          {isConfigured && (
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          )}
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="md" sx={{ mt: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        {!isConfigured ? (
          <SetupForm onSetupComplete={handleSetupComplete} />
        ) : (
          <ChatInterface 
            cloudflareToken={cloudflareToken}
            openaiKey={openaiKey}
            userInfo={userInfo}
          />
        )}
      </Container>
    </div>
  );
}

export default App;