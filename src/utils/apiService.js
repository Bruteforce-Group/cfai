/**
 * API Service Factory
 * 
 * This module provides a central factory for creating API service instances.
 * It handles common functionality like error handling, retries, and authentication.
 */

import axios from 'axios';
import { CLOUDFLARE_API_BASE, OPENAI_API_BASE, API_TIMEOUTS } from './api';

// Create an axios instance with custom configuration
const createApiClient = (baseURL, timeout, headers = {}) => {
  return axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
};

// Cloudflare API Service
export const createCloudflareService = (credential) => {
  // Extract headers based on credential type
  let headers = {};
  
  if (typeof credential === 'string') {
    // Try to parse if it's a stringified JSON
    try {
      if (credential.startsWith('{')) {
        credential = JSON.parse(credential);
      }
    } catch (e) {
      // If parsing fails, treat it as a direct token
      headers = { 'Authorization': `Bearer ${credential}` };
    }
  }
  
  // Handle object credential formats
  if (typeof credential === 'object') {
    if (credential.type === 'token') {
      headers = { 'Authorization': `Bearer ${credential.value}` };
    } else if (credential.type === 'global') {
      headers = {
        'X-Auth-Email': credential.email,
        'X-Auth-Key': credential.key
      };
    }
  }
  
  // If nothing matched, default to a direct token if credential is still a string
  if (Object.keys(headers).length === 0 && typeof credential === 'string') {
    headers = { 'Authorization': `Bearer ${credential}` };
  }
  
  // Create the API client
  const client = createApiClient(CLOUDFLARE_API_BASE, API_TIMEOUTS.cloudflare, headers);
  
  // Add response interceptor for common error handling
  client.interceptors.response.use(
    response => response,
    error => {
      // Log the error details for debugging
      console.error('Cloudflare API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        error: error.message,
        data: error.response?.data
      });
      
      // Return the error for further handling
      return Promise.reject(error);
    }
  );
  
  return {
    // Basic API methods
    get: (endpoint, params = {}) => client.get(endpoint, { params }),
    post: (endpoint, data = {}) => client.post(endpoint, data),
    put: (endpoint, data = {}) => client.put(endpoint, data),
    patch: (endpoint, data = {}) => client.patch(endpoint, data),
    delete: (endpoint, data = {}) => client.delete(endpoint, { data }),
    
    // Specific Cloudflare API methods
    listZones: () => client.get('/zones?per_page=50'),
    getDnsRecords: (zoneId) => client.get(`/zones/${zoneId}/dns_records`),
    createDnsRecord: (zoneId, record) => client.post(`/zones/${zoneId}/dns_records`, record),
    getUserInfo: () => client.get('/user'),
    listAccounts: () => client.get('/accounts')
  };
};

// OpenAI API Service
export const createOpenAIService = (apiKey) => {
  // Create the client
  const client = createApiClient(OPENAI_API_BASE, API_TIMEOUTS.openai);
  
  return {
    processQuery: (query) => client.post('', {
      requestId: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      query,
      apiKey
    })
  };
};