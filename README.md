# AI Banner Generator

A powerful web application that generates stunning social media banners using AI. Simply enter any website URL, and the app will analyze the content and create a professional banner using Claude AI.

## Features

- **Real Website Analysis**: Extracts title, description, keywords, and colors from any webpage
- **AI-Powered Design**: Uses Claude AI to generate unique SVG banners
- **Multiple Templates**: Choose from Modern, Minimal, Gradient, or Bold styles
- **Dual Format Export**: Download banners as SVG or PNG files
- **Responsive Design**: Works perfectly on desktop and mobile devices

## Setup

### Prerequisites

1. **Anthropic API Key**: Get your API key from [Anthropic Console](https://console.anthropic.com/)

### Environment Variables

1. Create a `.env` file in your project root (copy from `.env.example`)
2. Add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_actual_api_key_here
   ```

### For Netlify Deployment

1. In your Netlify dashboard, go to Site Settings > Environment Variables
2. Add the environment variable:
   - Key: `ANTHROPIC_API_KEY`
   - Value: Your Anthropic API key

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Deployment

The app is configured for Netlify deployment with:
- Netlify Functions for backend processing
- Automatic builds from your repository
- Environment variable support

## How It Works

1. **URL Analysis**: The Netlify function fetches and parses the target webpage
2. **Content Extraction**: Extracts title, description, keywords, and color information
3. **AI Generation**: Sends structured prompts to Claude AI to generate SVG banners
4. **Template Styling**: Applies the selected template style (Modern, Minimal, Gradient, Bold)
5. **Download Options**: Provides both SVG and PNG download formats

## Technology Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Netlify Functions
- **AI**: Claude AI (Anthropic)
- **Web Scraping**: Cheerio + Node Fetch
- **Build Tool**: Vite

## API Usage

The app uses Claude AI's text generation capabilities to create SVG code based on webpage content. This approach is cost-effective and provides high-quality, customizable results.

## Limitations

- Some websites may block scraping due to CORS or bot protection
- AI generation quality depends on the clarity of extracted content
- Complex websites might not extract colors perfectly

## Contributing

Feel free to submit issues and enhancement requests!