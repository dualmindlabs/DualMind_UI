/**
 * Response extractors
 * Extract clean responses from API data - EXACT COPY for Next.js
 * @module lib/api/utils/extractors
 */

/**
 * Extract chat response from API data
 */
export function extractChatResponse(data: any): string {
  if (!data) return '';
  
  // Direct response
  if (typeof data === 'string') return data;
  
  // Object with text field
  if (data.text) return data.text;
  if (data.content) return data.content;
  if (data.response) return data.response;
  if (data.message) return data.message;
  if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
  
  // Fallback to stringified
  return JSON.stringify(data);
}

/**
 * Extract dual chat response from API data
 */
export function extractDualChatResponse(data: any): { response1: string; response2: string; model1: string; model2: string; comparisonId: string } {
  if (!data) {
    return {
      response1: '',
      response2: '',
      model1: '',
      model2: '',
      comparisonId: '',
    };
  }
  
  // Check for structured response
  if (data.response1 && data.response2) {
    return {
      response1: extractChatResponse(data.response1),
      response2: extractChatResponse(data.response2),
      model1: data.model1 || '',
      model2: data.model2 || '',
      comparisonId: data.comparisonId || '',
    };
  }
  
  // Check for nested data
  if (data.data) {
    return extractDualChatResponse(data.data);
  }
  
  // Fallback
  return {
    response1: '',
    response2: '',
    model1: '',
    model2: '',
    comparisonId: '',
  };
}

export default { extractChatResponse, extractDualChatResponse };
