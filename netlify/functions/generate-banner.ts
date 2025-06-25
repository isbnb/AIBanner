import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import Anthropic from '@anthropic-ai/sdk';

interface RequestBody {
  url: string;
  template: 'modern' | 'minimal' | 'gradient' | 'bold';
}

interface AnalysisResult {
  title: string;
  description: string;
  colors: string[];
  keywords: string[];
  svgContent: string;
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const extractWebpageContent = async (url: string) => {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract title
    const title = $('title').text().trim() || 
                 $('meta[property="og:title"]').attr('content') || 
                 $('h1').first().text().trim() || 
                 'Untitled Page';

    // Extract description
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || 
                       $('p').first().text().trim().substring(0, 200) || 
                       'No description available';

    // Extract keywords
    const keywordsContent = $('meta[name="keywords"]').attr('content') || '';
    const keywords = keywordsContent ? keywordsContent.split(',').map(k => k.trim()) : [];

    // Extract main content for context
    const mainContent = $('main, article, .content, #content').first().text().trim().substring(0, 500) ||
                       $('body').text().trim().substring(0, 500);

    // Try to extract brand colors from CSS variables or common patterns
    const extractedColors: string[] = [];
    const styleContent = $('style').text();
    const colorMatches = styleContent.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\([^)]+\)|rgba\([^)]+\)/g);
    if (colorMatches) {
      extractedColors.push(...colorMatches.slice(0, 5));
    }

    return {
      title: title.substring(0, 100),
      description: description.substring(0, 200),
      keywords: keywords.slice(0, 10),
      mainContent,
      extractedColors
    };
  } catch (error) {
    console.error('Error extracting webpage content:', error);
    throw new Error('Failed to analyze webpage content');
  }
};

const generateBannerWithAI = async (content: any, template: string): Promise<string> => {
  const templateDescriptions = {
    modern: 'Clean, professional design with subtle geometric elements, plenty of white space, and a sophisticated color palette',
    minimal: 'Ultra-clean design with minimal elements, centered text, simple typography, and lots of white space',
    gradient: 'Dynamic design with vibrant gradients, bold colors, and modern visual effects',
    bold: 'Strong, impactful design with bold colors, large typography, and geometric shapes'
  };

  const prompt = `Create a professional social media banner in SVG format (1200x630 pixels) based on the following webpage content:

Title: ${content.title}
Description: ${content.description}
Keywords: ${content.keywords.join(', ')}
${content.extractedColors.length > 0 ? `Suggested colors from site: ${content.extractedColors.join(', ')}` : ''}

Template Style: ${template} - ${templateDescriptions[template as keyof typeof templateDescriptions]}

Requirements:
1. Create a complete, valid SVG with width="1200" height="630"
2. Use the title and description provided
3. Choose an appropriate color palette (you can use the suggested colors or create a harmonious palette)
4. Follow the ${template} template style guidelines
5. Ensure text is readable and well-positioned
6. Include subtle design elements that enhance the overall look
7. Make sure all text fits within the banner dimensions
8. Use web-safe fonts like Arial, sans-serif

Return ONLY the SVG code, no explanations or additional text.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const svgContent = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Clean up the response to ensure we only get the SVG
    const svgMatch = svgContent.match(/<svg[\s\S]*<\/svg>/i);
    if (svgMatch) {
      return svgMatch[0];
    } else {
      throw new Error('No valid SVG found in AI response');
    }
  } catch (error) {
    console.error('Error generating banner with AI:', error);
    throw new Error('Failed to generate banner with AI');
  }
};

export const handler: Handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    const body: RequestBody = JSON.parse(event.body || '{}');
    const { url, template } = body;

    if (!url || !template) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL and template are required' }),
      };
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid URL provided' }),
      };
    }

    // Extract webpage content
    const webpageContent = await extractWebpageContent(url);

    // Generate color palette (fallback if no colors extracted)
    const defaultColors = {
      modern: ['#3B82F6', '#14B8A6', '#F97316', '#EF4444', '#8B5CF6'],
      minimal: ['#1F2937', '#6B7280', '#9CA3AF', '#D1D5DB', '#F3F4F6'],
      gradient: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
      bold: ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6']
    };

    const colors = webpageContent.extractedColors.length > 0 
      ? webpageContent.extractedColors.slice(0, 5)
      : defaultColors[template];

    // Generate SVG banner using AI
    const svgContent = await generateBannerWithAI(webpageContent, template);

    const result: AnalysisResult = {
      title: webpageContent.title,
      description: webpageContent.description,
      colors,
      keywords: webpageContent.keywords,
      svgContent
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};