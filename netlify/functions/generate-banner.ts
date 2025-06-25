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

    // Extract domain for branding context
    const domain = new URL(url).hostname.replace('www.', '');

    // Try to extract brand colors from CSS variables or common patterns
    const extractedColors: string[] = [];
    const styleContent = $('style').text();
    const colorMatches = styleContent.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\([^)]+\)|rgba\([^)]+\)/g);
    if (colorMatches) {
      // Filter out common colors and get unique ones
      const uniqueColors = [...new Set(colorMatches)]
        .filter(color => !['#000', '#fff', '#ffffff', '#000000', 'rgb(0,0,0)', 'rgb(255,255,255)'].includes(color.toLowerCase()))
        .slice(0, 3);
      extractedColors.push(...uniqueColors);
    }

    return {
      title: title.substring(0, 100),
      description: description.substring(0, 200),
      keywords: keywords.slice(0, 10),
      mainContent,
      extractedColors,
      domain
    };
  } catch (error) {
    console.error('Error extracting webpage content:', error);
    throw new Error('Failed to analyze webpage content');
  }
};

const generateBannerWithAI = async (content: any, template: string): Promise<string> => {
  const templateDescriptions = {
    modern: 'Clean, professional design with subtle geometric elements, plenty of white space, and a sophisticated color palette. Use modern typography and minimal decorative elements.',
    minimal: 'Ultra-clean design with minimal elements, centered text, simple typography, and lots of white space. Focus on typography hierarchy and negative space.',
    gradient: 'Dynamic design with vibrant gradients, bold colors, and modern visual effects. Use smooth color transitions and contemporary styling.',
    bold: 'Strong, impactful design with bold colors, large typography, and geometric shapes. Create high contrast and eye-catching elements.'
  };

  const prompt = `Create a professional social media banner in SVG format (1200x630 pixels) to promote the following webpage:

WEBPAGE CONTENT:
- Original Title: ${content.title}
- Description: ${content.description}
- Domain: ${content.domain}
- Keywords: ${content.keywords.join(', ')}
${content.extractedColors.length > 0 ? `- Website Colors: ${content.extractedColors.join(', ')}` : ''}

DESIGN REQUIREMENTS:
1. Template Style: ${template} - ${templateDescriptions[template as keyof typeof templateDescriptions]}
2. Create compelling promotional text (don't copy the original title/description exactly)
3. Generate a catchy headline and subtitle that would make people want to visit the website
4. Use ONLY 2 main colors maximum (primary and secondary) plus white/black for text
5. Ensure ALL text fits comfortably within the 1200x630 canvas with proper margins
6. Use web-safe fonts (Arial, Helvetica, sans-serif)
7. Include the domain name subtly in the design
8. Make it look like a professional social media promotional banner

TEXT GUIDELINES:
- Create a compelling headline (not the exact page title)
- Write an engaging subtitle/tagline
- Keep text concise and readable
- Ensure proper text hierarchy
- Leave adequate margins (at least 60px from edges)

COLOR GUIDELINES:
- Use maximum 2 main colors from the website or create a harmonious 2-color palette
- Ensure high contrast for readability
- Use colors strategically to guide attention

Return ONLY the complete SVG code with proper viewBox and dimensions. No explanations.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 3000,
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

    // Generate simplified color palette (max 2 colors)
    const defaultColorPalettes = {
      modern: ['#3B82F6', '#64748B'],
      minimal: ['#1F2937', '#9CA3AF'],
      gradient: ['#6366F1', '#EC4899'],
      bold: ['#EF4444', '#F59E0B']
    };

    let colors = defaultColorPalettes[template];
    if (webpageContent.extractedColors.length >= 2) {
      colors = webpageContent.extractedColors.slice(0, 2);
    } else if (webpageContent.extractedColors.length === 1) {
      colors = [webpageContent.extractedColors[0], defaultColorPalettes[template][1]];
    }

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