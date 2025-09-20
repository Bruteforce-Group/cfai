import axios from 'axios';

// API endpoint configuration
const API_CONFIG = {
  // Cloudflare API
  cloudflare: {
    useProxy: true, // Set to true to use the local proxy server
    directApi: 'https://api.cloudflare.com/client/v4',
    proxyApi: 'http://localhost:3010/cf',
    timeout: 15000, // 15 seconds
  },
  // OpenAI API
  openai: {
    proxyUrl: 'http://localhost:3010/openai/process',
    timeout: 30000, // 30 seconds
  }
};

// Centralized API base URL getter
export const getApiBaseUrl = (api) => {
  switch(api) {
    case 'cloudflare':
      return API_CONFIG.cloudflare.useProxy 
        ? API_CONFIG.cloudflare.proxyApi 
        : API_CONFIG.cloudflare.directApi;
    case 'openai':
      return API_CONFIG.openai.proxyUrl;
    default:
      throw new Error(`Unknown API: ${api}`);
  }
};

// Export for other modules to use
export const CLOUDFLARE_API_BASE = getApiBaseUrl('cloudflare');
export const OPENAI_API_BASE = getApiBaseUrl('openai');
export const API_TIMEOUTS = {
  cloudflare: API_CONFIG.cloudflare.timeout,
  openai: API_CONFIG.openai.timeout
};

// Get Cloudflare authorization headers based on credential type
const getCloudflareHeaders = (credential) => {
  console.log("Getting headers for credential:", typeof credential);
  
  // If it's a string that might be JSON, try to parse it
  if (typeof credential === 'string' && 
     (credential.startsWith('{') || credential.includes('"type"'))) {
    try {
      console.log("Attempting to parse JSON credential string");
      credential = JSON.parse(credential);
      console.log("Successfully parsed to:", credential.type);
    } catch (e) {
      console.error("Failed to parse credential string:", e.message);
    }
  }
  
  // Now handle based on the type
  if (typeof credential === 'object') {
    if (credential.type === 'token') {
      console.log("Using API token authentication");
      return {
        'Authorization': `Bearer ${credential.value}`,
        'Content-Type': 'application/json',
      };
    } else if (credential.type === 'global') {
      console.log("Using Global API key authentication");
      return {
        'X-Auth-Email': credential.email,
        'X-Auth-Key': credential.key,
        'Content-Type': 'application/json',
      };
    }
  }
  
  // If we still have a string, assume it's a direct token
  if (typeof credential === 'string') {
    console.log("Using direct token authentication");
    return {
      'Authorization': `Bearer ${credential}`,
      'Content-Type': 'application/json',
    };
  }
  
  console.error("Invalid credential format:", credential);
  throw new Error('Invalid credential type or format');
};

// Check if API credentials are valid with detailed feedback
export const checkApiCredentials = async (cloudflareCredential, openaiKey) => {
  const result = {
    cloudflareSuccess: false,
    openaiSuccess: false,
    cloudflareDetails: '',
    openaiDetails: '',
    userInfo: null,
    zones: [],
    debugInfo: {}
  };
  
  try {
    // Debug info about what credentials we received
    console.log("Credential type received:", typeof cloudflareCredential);
    if (typeof cloudflareCredential === 'object') {
      console.log("Credential has properties:", Object.keys(cloudflareCredential));
      result.debugInfo.credentialType = cloudflareCredential.type;
    } else if (typeof cloudflareCredential === 'string') {
      console.log("Credential string starts with:", cloudflareCredential.substring(0, 10) + "...");
      if (cloudflareCredential.includes('{')) {
        try {
          const parsed = JSON.parse(cloudflareCredential);
          result.debugInfo.parsedType = parsed.type;
        } catch (e) {
          console.log("Could not parse credential string");
        }
      }
    }
    
    // Check Cloudflare credentials
    const headers = getCloudflareHeaders(cloudflareCredential);
    console.log("Headers being used:", Object.keys(headers));
    result.debugInfo.headers = Object.keys(headers);
    
    try {
      // Test 1: Verify user access
      console.log("Making request to /user endpoint");
      const userResponse = await axios.get(`${CLOUDFLARE_API_BASE}/user`, { 
        headers,
        timeout: 10000, // 10 second timeout
        validateStatus: status => status < 500 // Accept any status < 500 to handle API errors
      });
      console.log("User response status:", userResponse.status);
      
      if (userResponse.data?.success) {
        result.cloudflareSuccess = true;
        result.userInfo = userResponse.data.result;
        result.cloudflareDetails = `Successfully connected as ${userResponse.data.result.email}`;
        
        // Test 2: Try to fetch zones (websites)
        try {
          console.log("Making request to /zones endpoint");
          const zonesResponse = await axios.get(`${CLOUDFLARE_API_BASE}/zones?per_page=5`, { headers });
          console.log("Zones response status:", zonesResponse.status);
          
          if (zonesResponse.data?.success) {
            result.zones = zonesResponse.data.result;
            if (zonesResponse.data.result.length > 0) {
              result.cloudflareDetails += `. Found ${zonesResponse.data.result.length} zones (websites)`;
            } else {
              result.cloudflareDetails += ". No zones (websites) found in this account";
            }
          }
        } catch (error) {
          console.error('Zone fetch error:', error.message);
          result.debugInfo.zoneError = error.message;
          // Not a failure case, just limited permissions
          result.cloudflareDetails += ". Unable to list zones - limited permissions";
        }
      } else {
        result.cloudflareDetails = 'Invalid credentials or insufficient permissions';
        console.log("User response indicated failure:", userResponse.data);
        result.debugInfo.userResponse = userResponse.data;
      }
    } catch (error) {
      console.error('Cloudflare validation error:', error.message);
      result.cloudflareDetails = error.response?.data?.errors?.[0]?.message || 'Connection failed';
      result.debugInfo.cfError = {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      };
    }
    
    // Check OpenAI API key
    try {
      const openaiResponse = await axios.get('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (openaiResponse.data?.data) {
        result.openaiSuccess = true;
        
        // Check if GPT-4 is available to the user
        const hasGpt4 = openaiResponse.data.data.some(model => 
          model.id.startsWith('gpt-4')
        );
        
        result.openaiDetails = hasGpt4 
          ? 'Successfully connected with access to GPT-4 models'
          : 'Successfully connected, but no GPT-4 access detected';
      } else {
        result.openaiDetails = 'Invalid API key or response format';
      }
    } catch (error) {
      console.error('OpenAI validation error:', error);
      result.openaiDetails = error.response?.data?.error?.message || 'Connection failed';
    }
    
    return result;
  } catch (error) {
    console.error('API validation error:', error);
    return result;
  }
};

// Create a new Cloudflare API token with required permissions
export const createCloudflareToken = async (globalCredentials) => {
  console.log("Creating token with global credentials...");
  console.log("Email:", globalCredentials.email);
  console.log("Key (first 4 chars):", globalCredentials.key.substring(0, 4) + "...");
  
  try {
    const headers = {
      'X-Auth-Email': globalCredentials.email,
      'X-Auth-Key': globalCredentials.key,
      'Content-Type': 'application/json',
    };
    
    // First verify the global API key works by getting user details
    console.log("Verifying global API key via /user endpoint...");
    const userResponse = await axios.get(`${CLOUDFLARE_API_BASE}/user`, { headers });
    
    if (!userResponse.data?.success) {
      console.error("User endpoint failed:", userResponse.data);
      throw new Error('Failed to validate Global API Key');
    }
    
    console.log("Global API key verified successfully");
    
    // Get accounts to create token for
    console.log("Fetching accounts...");
    const accountsResponse = await axios.get(`${CLOUDFLARE_API_BASE}/accounts`, { headers });
    
    if (!accountsResponse.data?.success || accountsResponse.data.result.length === 0) {
      console.error("Accounts endpoint failed or returned no results:", accountsResponse.data);
      throw new Error('No accounts found to create token for');
    }
    
    console.log(`Found ${accountsResponse.data.result.length} accounts`);
    
    // Using a simpler token creation approach
    console.log("Creating API token...");
    const tokenPayload = {
      name: "CloudflareAI App Token",
      expires_on: "2100-01-01T00:00:00Z",
      policies: [
        {
          effect: "allow",
          resources: {
            "com.cloudflare.api.account.*": "*"
          },
          permission_groups: [
            { id: "3030687196b94b638145a3953da2b699", name: "Account Settings Read" }
          ]
        },
        {
          effect: "allow",
          resources: {
            "com.cloudflare.api.zone.*": "*"
          },
          permission_groups: [
            { id: "e6d2666161e84845a636613608cee8d5", name: "Zone Read" },
            { id: "28f4b596e7d643029c524985477ae49a", name: "DNS Write" },
            { id: "6d7ce36855fb4019a736b47e4f2e6f91", name: "Zone Settings Write" }
          ]
        }
      ]
    };
    
    console.log("Token payload:", JSON.stringify(tokenPayload, null, 2));
    
    try {
      const tokenResponse = await axios.post(
        `${CLOUDFLARE_API_BASE}/user/tokens`, 
        tokenPayload,
        { headers }
      );
      
      console.log("Token creation response status:", tokenResponse.status);
      
      if (!tokenResponse.data?.success || !tokenResponse.data.result?.value) {
        console.error("Token creation failed:", tokenResponse.data);
        throw new Error('Failed to create API token: ' + JSON.stringify(tokenResponse.data?.errors));
      }
      
      console.log("API token created successfully");
      return tokenResponse.data.result.value;
    } catch (tokenError) {
      console.error("Token creation error:", tokenError.message);
      console.error("Token error response:", tokenError.response?.data);
      
      // If the token creation fails, try a different approach - use a simpler token
      console.log("Trying alternative token creation...");
      const simpleTokenPayload = {
        name: "CloudflareAI Read Token",
        policies: [
          {
            effect: "allow",
            resources: {
              "*": "*"
            },
            permission_groups: [
              { id: "e6d2666161e84845a636613608cee8d5", name: "Zone Read" }
            ]
          }
        ]
      };
      
      try {
        const simpleTokenResponse = await axios.post(
          `${CLOUDFLARE_API_BASE}/user/tokens`, 
          simpleTokenPayload,
          { headers }
        );
        
        if (simpleTokenResponse.data?.success && simpleTokenResponse.data.result?.value) {
          console.log("Simple token created successfully");
          return simpleTokenResponse.data.result.value;
        } else {
          throw new Error('Failed to create alternative API token');
        }
      } catch (altError) {
        console.error("Alternative token creation failed:", altError.message);
        throw altError;
      }
    }
  } catch (error) {
    console.error('Error creating API token:', error.message);
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
    }
    throw new Error(error.response?.data?.errors?.[0]?.message || 'Failed to create API token: ' + error.message);
  }
};