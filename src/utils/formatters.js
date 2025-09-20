/**
 * Formatting utilities for API responses
 */

// Format Cloudflare API response for display
export const formatCloudflareResponse = (response) => {
  if (!response) {
    return 'No response received';
  }
  
  try {
    // If response is already a string, return it
    if (typeof response === 'string') {
      return response;
    }
    
    // Handle success responses
    if (response.success && response.result) {
      if (Array.isArray(response.result)) {
        // Format list results
        if (response.result.length === 0) {
          return 'No results found.';
        }
        
        // Determine the type of results we're showing
        let resultType = 'items';
        
        if (response.result[0].zone_name) {
          resultType = 'DNS records';
        } else if (response.result[0].name && response.result[0].status) {
          resultType = 'zones';
        } else if (response.result[0].email) {
          resultType = 'users';
        }
        
        // Format the output
        return `Found ${response.result.length} ${resultType}:\n\n${formatArrayResults(response.result)}`;
      } else {
        // Format single object result
        return formatObjectResult(response.result);
      }
    }
    
    // Handle error responses
    if (response.errors && response.errors.length > 0) {
      return `Error: ${response.errors[0].message}`;
    }
    
    // Default JSON formatting as fallback
    return JSON.stringify(response, null, 2);
  } catch (error) {
    console.error('Error formatting Cloudflare response:', error);
    return JSON.stringify(response, null, 2);
  }
};

// Format an array of results into a human-readable string
const formatArrayResults = (results) => {
  if (!Array.isArray(results) || results.length === 0) {
    return 'No items found';
  }
  
  // Determine what type of objects we're dealing with
  const firstItem = results[0];
  
  // Format DNS records
  if (firstItem.type && firstItem.name && firstItem.content) {
    return results.map(record => (
      `${record.name} (${record.type}): ${record.content}${record.proxied ? ' [Proxied]' : ''}`
    )).join('\n');
  }
  
  // Format zones (websites)
  if (firstItem.name && firstItem.status) {
    return results.map(zone => (
      `${zone.name} (${zone.status})${zone.development_mode ? ' [Development Mode]' : ''}`
    )).join('\n');
  }
  
  // Format users
  if (firstItem.email) {
    return results.map(user => (
      `${user.email} - ${user.name || 'No name provided'}`
    )).join('\n');
  }
  
  // Generic formatting as fallback
  return results.map(item => {
    const mainProperty = 
      item.name || item.title || item.id || item.email || 
      Object.values(item)[0] || 'Item';
    
    return `- ${mainProperty}`;
  }).join('\n');
};

// Format a single object result into a human-readable string
const formatObjectResult = (result) => {
  if (!result || typeof result !== 'object') {
    return 'No data available';
  }
  
  // Format specific types of objects
  if (result.zone_name && result.type && result.content) {
    // DNS record
    return `DNS Record: ${result.name} (${result.type})\nContent: ${result.content}\nTTL: ${result.ttl}\nProxied: ${result.proxied ? 'Yes' : 'No'}`;
  }
  
  if (result.name && result.status) {
    // Zone
    return `Website: ${result.name}\nStatus: ${result.status}\nPlan: ${result.plan?.name || 'Unknown'}\nDevelopment Mode: ${result.development_mode ? 'On' : 'Off'}`;
  }
  
  if (result.email) {
    // User
    return `User: ${result.email}\nName: ${result.name || 'Not specified'}\nStatus: ${result.status || 'Unknown'}`;
  }
  
  // Default formatting
  const entries = Object.entries(result)
    .filter(([key, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      if (typeof value === 'object' && !Array.isArray(value)) {
        return `${key}: [Object]`;
      } else if (Array.isArray(value)) {
        return `${key}: [Array with ${value.length} items]`;
      } else {
        return `${key}: ${value}`;
      }
    });
  
  return entries.join('\n');
};