import axios from 'axios';
import { CLOUDFLARE_API_BASE, API_TIMEOUTS } from './api';

// Get Cloudflare authorization headers based on credential type
const getCloudflareHeaders = (credential) => {
  // If credential is a string, it's a token
  if (typeof credential === 'string') {
    return {
      'Authorization': `Bearer ${credential}`,
      'Content-Type': 'application/json',
    };
  }
  
  // If credential is a JSON string, parse it
  if (typeof credential === 'string' && 
     (credential.startsWith('{') || credential.includes('"type"') || credential.includes('global'))) {
    try {
      credential = JSON.parse(credential);
    } catch (e) {
      console.error('Failed to parse credential JSON', e);
    }
  }
  
  // Now handle the object format
  if (credential.type === 'token') {
    return {
      'Authorization': `Bearer ${credential.value}`,
      'Content-Type': 'application/json',
    };
  } else if (credential.type === 'global') {
    return {
      'X-Auth-Email': credential.email,
      'X-Auth-Key': credential.key,
      'Content-Type': 'application/json',
    };
  }
  
  // Default to token if we can't determine
  return {
    'Authorization': `Bearer ${credential}`,
    'Content-Type': 'application/json',
  };
};

// Execute Cloudflare API request
export const executeCloudflareFunctions = async (method, endpoint, params, credential) => {
  // Ensure we have valid values for all parameters
  const safeMethod = method || 'GET';
  const safeEndpoint = endpoint || '/user';
  const safeParams = params || {};
  
  // Ensure endpoint starts with a slash
  const normalizedEndpoint = safeEndpoint.startsWith('/') ? safeEndpoint : `/${safeEndpoint}`;
  
  const url = `${CLOUDFLARE_API_BASE}${normalizedEndpoint}`;
  const headers = getCloudflareHeaders(credential);

  try {
    let response;

    switch ((safeMethod || '').toLowerCase()) {
      case 'get':
        response = await axios.get(url, { 
          headers, 
          params: safeParams,
          timeout: API_TIMEOUTS.cloudflare
        });
        break;
      case 'post':
        response = await axios.post(url, safeParams, { 
          headers,
          timeout: API_TIMEOUTS.cloudflare
        });
        break;
      case 'put':
        response = await axios.put(url, safeParams, { 
          headers,
          timeout: API_TIMEOUTS.cloudflare
        });
        break;
      case 'patch':
        response = await axios.patch(url, safeParams, { 
          headers,
          timeout: API_TIMEOUTS.cloudflare
        });
        break;
      case 'delete':
        response = await axios.delete(url, { 
          headers, 
          data: safeParams,
          timeout: API_TIMEOUTS.cloudflare
        });
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    if (response.data.success === false) {
      throw new Error(response.data.errors?.[0]?.message || 'Cloudflare API error');
    }

    return response.data;
    
  } catch (error) {
    console.error('Cloudflare API error:', error);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      throw new Error(
        error.response.data.errors?.[0]?.message || 
        `Error ${error.response.status}: ${error.response.statusText}`
      );
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('No response received from Cloudflare API');
    } else {
      // Something happened in setting up the request that triggered an Error
      throw error;
    }
  }
};

// Helper function to list all zones (websites)
export const listZones = async (credential) => {
  return executeCloudflareFunctions('get', '/zones?per_page=50', null, credential);
};

// Helper function to get DNS records for a zone
export const getDnsRecords = async (zoneId, credential) => {
  return executeCloudflareFunctions('get', `/zones/${zoneId}/dns_records`, null, credential);
};

// Helper function to list available API endpoints
export const getAPIInfo = async (credential) => {
  // First get user details 
  const userInfo = await executeCloudflareFunctions('get', '/user', null, credential);
  
  // Then get account information
  const accounts = await executeCloudflareFunctions('get', '/accounts', null, credential);
  
  // If there are accounts, get zones for the first account
  let zones = { result: [] };
  if (accounts.result && accounts.result.length > 0) {
    try {
      zones = await executeCloudflareFunctions(
        'get', 
        '/zones?per_page=10', 
        null, 
        credential
      );
    } catch (error) {
      console.error('Error fetching zones:', error);
    }
  }
  
  return {
    user: userInfo.result,
    accounts: accounts.result,
    zones: zones.result
  };
};