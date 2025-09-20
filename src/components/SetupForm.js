import React, { useState } from 'react';
import { 
  Paper, Box, Typography, TextField, Button, 
  Stepper, Step, StepLabel, Alert, Link,
  CircularProgress, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel
} from '@mui/material';
import { checkApiCredentials, createCloudflareToken } from '../utils/api';

const SetupForm = ({ onSetupComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [cloudflareType, setCloudflareType] = useState('token');
  const [cloudflareToken, setCloudflareToken] = useState('');
  const [cloudflareGlobalKey, setCloudflareGlobalKey] = useState('');
  const [cloudflareEmail, setCloudflareEmail] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState({});

  const steps = ['Cloudflare Credentials', 'OpenAI API Key', 'API Test', 'Confirm'];

  const handleNext = async () => {
    setError('');
    
    if (activeStep === 0) {
      if (cloudflareType === 'token' && !cloudflareToken) {
        setError('Please enter your Cloudflare API token');
        return;
      }
      
      if (cloudflareType === 'global' && (!cloudflareGlobalKey || !cloudflareEmail)) {
        setError('Please enter both your Cloudflare Global API key and email');
        return;
      }
    }
    
    if (activeStep === 1 && !openaiKey) {
      setError('Please enter your OpenAI API key');
      return;
    }
    
    if (activeStep === 2) {
      setLoading(true);
      try {
        // Test the API credentials
        const cfCredential = cloudflareType === 'token' 
          ? { type: 'token', value: cloudflareToken }
          : { type: 'global', email: cloudflareEmail, key: cloudflareGlobalKey };
          
        try {
          const testResult = await checkApiCredentials(cfCredential, openaiKey);
          setTestResults(testResult);
          
          if (!testResult.cloudflareSuccess || !testResult.openaiSuccess) {
            setError(
              testResult.cfError?.message === 'Network Error' 
                ? 'Network error connecting to Cloudflare API. This could be due to CORS restrictions in the browser. Please check your network connection or try using an API token instead.' 
                : 'API test failed. Please check your credentials.'
            );
            setLoading(false);
            return;
          }
        } catch (testError) {
          console.error("Error during API test:", testError);
          setTestResults({
            cloudflareSuccess: false,
            openaiSuccess: false,
            cloudflareDetails: testError.message,
            debugInfo: { error: testError.message }
          });
          setError('Error testing API credentials: ' + testError.message);
          setLoading(false);
          return;
        }
        
        // If using global API key, offer to create scoped tokens
        if (cloudflareType === 'global' && !cloudflareToken) {
          try {
            setTestResults(prev => ({
              ...prev,
              tokenStatus: "Creating token with required permissions..."
            }));
            
            console.log("Attempting to create API token from global key");
            const newToken = await createCloudflareToken({
              email: cloudflareEmail,
              key: cloudflareGlobalKey
            });
            
            if (newToken) {
              console.log("Token created successfully:", newToken.substring(0, 5) + "...");
              setCloudflareToken(newToken);
              setTestResults(prev => ({
                ...prev,
                createdToken: true,
                tokenInfo: "Created token with required permissions"
              }));
            }
          } catch (err) {
            console.error("Error creating token:", err);
            setTestResults(prev => ({
              ...prev,
              tokenError: err.message || "Failed to create token",
              tokenStatus: "Will continue with Global API Key instead"
            }));
            // Continue with global key if token creation fails
          }
        }
        
      } catch (err) {
        setError('Error testing credentials: ' + err.message);
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    
    if (activeStep === 3) {
      setLoading(true);
      try {
        // Use either the created token or the original credential
        let finalCredentials;
        
        if (cloudflareToken) {
          // If we have a token (either original or newly created), use it
          finalCredentials = { 
            type: 'token', 
            value: cloudflareToken 
          };
        } else if (cloudflareType === 'global') {
          // Otherwise, use global credentials
          finalCredentials = { 
            type: 'global', 
            email: cloudflareEmail, 
            key: cloudflareGlobalKey 
          };
        } else {
          // Fallback to token mode with the provided token
          finalCredentials = { 
            type: 'token', 
            value: cloudflareToken 
          };
        }
        
        // Double check that we're sending a JSON string for object credentials
        const serializedCredentials = typeof finalCredentials === 'string' 
          ? finalCredentials 
          : JSON.stringify(finalCredentials);
            
        onSetupComplete({ 
          cloudflareToken: serializedCredentials, 
          openaiKey 
        });
      } catch (err) {
        setError('Error completing setup: ' + err.message);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    setActiveStep(prevStep => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep(prevStep => prevStep - 1);
    setError('');
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: '600px', mx: 'auto', mt: 4 }}>
      <Typography variant="h5" component="h1" gutterBottom align="center">
        CloudflareAI Setup
      </Typography>
      
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Box sx={{ mt: 2 }}>
        {activeStep === 0 && (
          <>
            <Typography variant="body1" paragraph>
              You'll need Cloudflare API credentials to manage your resources.
            </Typography>
            
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <FormLabel component="legend">Credential Type</FormLabel>
              <RadioGroup
                row
                value={cloudflareType}
                onChange={(e) => setCloudflareType(e.target.value)}
              >
                <FormControlLabel 
                  value="token" 
                  control={<Radio />} 
                  label="API Token (Recommended)" 
                />
                <FormControlLabel 
                  value="global" 
                  control={<Radio />} 
                  label="Global API Key" 
                />
              </RadioGroup>
            </FormControl>
            
            {cloudflareType === 'token' ? (
              <>
                <Typography variant="body2" paragraph>
                  <Link href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener">
                    Create a token on Cloudflare dashboard
                  </Link> with the following permissions:
                </Typography>
                <Box component="ul" sx={{ mb: 2, pl: 4 }}>
                  <li>Zone - DNS - Edit</li>
                  <li>Zone - Page Rules - Edit</li>
                  <li>Zone - Zone - Edit</li>
                  <li>Zone - Workers Routes - Edit</li>
                  <li>Account - Account Settings - Read</li>
                </Box>
                <TextField
                  label="Cloudflare API Token"
                  fullWidth
                  value={cloudflareToken}
                  onChange={(e) => setCloudflareToken(e.target.value)}
                  margin="normal"
                  type="password"
                  variant="outlined"
                  autoFocus
                />
              </>
            ) : (
              <>
                <Typography variant="body2" paragraph>
                  You can find your Global API Key in the 
                  <Link href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener">
                    {" Cloudflare Dashboard > Profile > API Tokens"}
                  </Link> section.
                </Typography>
                <Typography variant="body2" paragraph color="warning.main">
                  Note: Using the Global API Key grants full access to your Cloudflare account. We'll help you create scoped tokens with the minimum required permissions.
                </Typography>
                <TextField
                  label="Cloudflare Email"
                  fullWidth
                  value={cloudflareEmail}
                  onChange={(e) => setCloudflareEmail(e.target.value)}
                  margin="normal"
                  type="email"
                  variant="outlined"
                  autoFocus
                />
                <TextField
                  label="Cloudflare Global API Key"
                  fullWidth
                  value={cloudflareGlobalKey}
                  onChange={(e) => setCloudflareGlobalKey(e.target.value)}
                  margin="normal"
                  type="password"
                  variant="outlined"
                />
              </>
            )}
          </>
        )}
        
        {activeStep === 1 && (
          <>
            <Typography variant="body1" paragraph>
              You'll need an OpenAI API key to handle natural language processing.
            </Typography>
            <Typography variant="body2" paragraph>
              <Link href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">
                Get your API key from OpenAI
              </Link>
            </Typography>
            <TextField
              label="OpenAI API Key"
              fullWidth
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              margin="normal"
              type="password"
              variant="outlined"
              autoFocus
            />
          </>
        )}
        
        {activeStep === 2 && (
          <>
            <Typography variant="body1" paragraph>
              Testing your API credentials...
            </Typography>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                For enhanced security and to avoid Cross-Origin Resource Sharing (CORS) issues, 
                please ensure you've started the proxy server with:
              </Typography>
              <Box component="pre" sx={{ backgroundColor: '#f5f5f5', p: 1, borderRadius: 1, mt: 1 }}>
                npm run server
              </Box>
              <Typography variant="body2" sx={{ mt: 1 }}>
                This local server will securely relay API requests to Cloudflare while avoiding browser restrictions.
              </Typography>
            </Alert>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ my: 2 }}>
                {Object.keys(testResults).length > 0 ? (
                  <>
                    <Alert 
                      severity={testResults.cloudflareSuccess ? "success" : "error"}
                      sx={{ mb: 2 }}
                    >
                      Cloudflare API: {testResults.cloudflareSuccess ? "Connected successfully" : "Failed to connect"}
                      {testResults.cloudflareDetails && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {testResults.cloudflareDetails}
                        </Typography>
                      )}
                    </Alert>
                    
                    <Alert 
                      severity={testResults.openaiSuccess ? "success" : "error"}
                      sx={{ mb: 2 }}
                    >
                      OpenAI API: {testResults.openaiSuccess ? "Connected successfully" : "Failed to connect"}
                      {testResults.openaiDetails && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {testResults.openaiDetails}
                        </Typography>
                      )}
                    </Alert>
                    
                    {testResults.tokenStatus && (
                      <Alert 
                        severity="info"
                        sx={{ mb: 2 }}
                      >
                        {testResults.tokenStatus}
                      </Alert>
                    )}
                    
                    {testResults.createdToken && (
                      <Alert 
                        severity="success"
                        sx={{ mb: 2 }}
                      >
                        Successfully created a scoped API token with required permissions
                      </Alert>
                    )}
                    
                    {testResults.tokenError && (
                      <Alert 
                        severity="warning"
                        sx={{ mb: 2 }}
                      >
                        <Typography variant="body2">
                          Token creation failed: {testResults.tokenError}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          The app will continue using your Global API Key instead
                        </Typography>
                        {testResults.tokenError.includes('Network Error') && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            This appears to be a network error. Browser security restrictions may prevent 
                            direct API access from client-side applications. Consider manually creating 
                            an API token in the Cloudflare dashboard and using that instead.
                          </Typography>
                        )}
                      </Alert>
                    )}
                    
                    {testResults.debugInfo && Object.keys(testResults.debugInfo).length > 0 && (
                      <Box sx={{ mt: 2, mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Debug Information:
                        </Typography>
                        <pre style={{ fontSize: '10px', overflow: 'auto', maxHeight: '100px' }}>
                          {JSON.stringify(testResults.debugInfo, null, 2)}
                        </pre>
                      </Box>
                    )}
                  </>
                ) : (
                  <Typography color="text.secondary">
                    Click "Test" to verify your credentials.
                  </Typography>
                )}
              </Box>
            )}
          </>
        )}
        
        {activeStep === 3 && (
          <>
            <Typography variant="body1" paragraph>
              Please confirm your settings:
            </Typography>
            <Box sx={{ mb: 2 }}>
              {cloudflareType === 'token' ? (
                <Typography variant="body2">
                  • Cloudflare API Token: ••••••••{cloudflareToken.slice(-4)}
                </Typography>
              ) : cloudflareToken ? (
                <Typography variant="body2">
                  • Created Cloudflare API Token: ••••••••{cloudflareToken.slice(-4)}
                </Typography>
              ) : (
                <>
                  <Typography variant="body2">
                    • Cloudflare Email: {cloudflareEmail}
                  </Typography>
                  <Typography variant="body2">
                    • Cloudflare Global API Key: ••••••••{cloudflareGlobalKey.slice(-4)}
                  </Typography>
                </>
              )}
              <Typography variant="body2">
                • OpenAI API Key: ••••••••{openaiKey.slice(-4)}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              Your API credentials will be stored securely in your browser's local storage and will not be sent to any server besides Cloudflare and OpenAI.
            </Typography>
          </>
        )}
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          disabled={activeStep === 0 || loading}
          onClick={handleBack}
        >
          Back
        </Button>
        
        {activeStep === 2 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={loading}
          >
            {loading ? "Testing..." : (Object.keys(testResults).length > 0 ? "Continue" : "Test")}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={loading}
          >
            {activeStep === steps.length - 1 ? "Finish" : "Next"}
          </Button>
        )}
      </Box>
    </Paper>
  );
};

export default SetupForm;