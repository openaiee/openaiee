import type { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge'
};

export default async function handler(req: NextRequest) {
  const url = new URL(req.url);

  if (url.pathname.startsWith('/v1beta')) {
    url.host = 'generativelanguage.googleapis.com';
  } else if (url.pathname.startsWith('/headers')) {
    url.host = 'httpbin.org';
  } else if (url.pathname.startsWith('/openai/v1')) {
    url.host = 'api.groq.com';
  } else if (url.pathname.startsWith('/v1/messages') || url.pathname.startsWith('/v1/complete')) {
    url.host = 'api.anthropic.com';
  } else {
    url.host = 'api.openai.com';
  }
  
  url.protocol = 'https:';
  url.port = '';

  const headers = new Headers();

  // Set essential headers
  headers.set('host', url.host);
  headers.set('accept', '*/*');
  headers.set('accept-language', 'en-US,en;q=0.9');
  headers.set('content-type', req.headers.get('content-type') || 'application/json');
  headers.set('sec-ch-ua', '"Google Chrome";v="113", "Chromium";v="113", "Not-A.Brand";v="24"');
  headers.set('sec-ch-ua-mobile', '?0');
  headers.set('sec-ch-ua-platform', '"Windows"');
  headers.set('sec-fetch-dest', 'empty');
  headers.set('sec-fetch-mode', 'cors');
  headers.set('sec-fetch-site', 'same-origin');
  headers.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36');

  // Set a US-based IP
  headers.set('X-Forwarded-For', '104.28.220.' + Math.floor(Math.random() * 256));

  // Only transfer specific headers from the original request
  const allowedHeaders = ['authorization', 'content-length', 'x-api-key'];
  for (const header of allowedHeaders) {
    const value = req.headers.get(header);
    if (value) {
      headers.set(header, value);
    }
  }

  try {
    const { method, body, signal } = req;
    
    const response = await fetch(
      url.toString(),
      {
        method,
        headers,
        body,
        signal,
      }
    );

    // Clone the response and modify its headers
    const modifiedResponse = new Response(response.body, response);
    modifiedResponse.headers.delete('cf-ray');
    modifiedResponse.headers.delete('cf-cache-status');
    modifiedResponse.headers.delete('report-to');
    modifiedResponse.headers.delete('nel');

    return modifiedResponse;
  } catch (error) {
    console.error('Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
