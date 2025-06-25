import React, { useState, useRef } from 'react';
import { Download, Link, Palette, Image, Loader, CheckCircle, AlertCircle, Wand2 } from 'lucide-react';

interface BannerData {
  title: string;
  subtitle: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  template: 'modern' | 'minimal' | 'gradient' | 'bold';
}

interface AnalysisResult {
  title: string;
  description: string;
  colors: string[];
  keywords: string[];
  svgContent: string;
}

function App() {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<BannerData['template']>('modern');
  const [isGenerating, setIsGenerating] = useState(false);
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const templates = [
    { id: 'modern', name: 'Modern', description: 'Clean and professional' },
    { id: 'minimal', name: 'Minimal', description: 'Simple and elegant' },
    { id: 'gradient', name: 'Gradient', description: 'Vibrant and dynamic' },
    { id: 'bold', name: 'Bold', description: 'Strong and impactful' }
  ];

  const analyzeUrl = async (inputUrl: string) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/generate-banner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: inputUrl,
          template: selectedTemplate
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to analyze URL');
      }

      const result: AnalysisResult = await response.json();
      setAnalysisResult(result);
      setSvgContent(result.svgContent);
    } catch (error) {
      console.error('Error analyzing URL:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze URL');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const regenerateBanner = async () => {
    if (!url) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/generate-banner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          template: selectedTemplate
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate banner');
      }

      const result: AnalysisResult = await response.json();
      setAnalysisResult(result);
      setSvgContent(result.svgContent);
    } catch (error) {
      console.error('Error generating banner:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate banner');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadSVG = () => {
    if (!svgContent) return;
    
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'social-banner.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadPNG = () => {
    if (!svgContent) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    canvas.width = 1200;
    canvas.height = 630;
    
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const pngUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = pngUrl;
          a.download = 'social-banner.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(pngUrl);
        }
      }, 'image/png');
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url) {
      try {
        new URL(url);
        analyzeUrl(url);
      } catch {
        setError('Please enter a valid URL');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-teal-500 rounded-xl flex items-center justify-center">
              <Wand2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Banner Generator</h1>
              <p className="text-sm text-gray-600">Create stunning social media banners from any webpage using AI</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* URL Input Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Link className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-semibold text-gray-900">Analyze Website</h2>
            </div>
            
            <form onSubmit={handleUrlSubmit} className="flex gap-4">
              <div className="flex-1">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter website URL (e.g., https://example.com)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isAnalyzing}
                className="px-8 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Palette className="w-5 h-5" />
                    Analyze & Generate
                  </>
                )}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700">{error}</p>
              </div>
            )}
          </div>

          {/* Template Selection */}
          {analysisResult && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Image className="w-6 h-6 text-purple-500" />
                  <h2 className="text-xl font-semibold text-gray-900">Choose Different Template</h2>
                </div>
                
                <button
                  onClick={regenerateBanner}
                  disabled={isGenerating}
                  className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Regenerate Banner
                    </>
                  )}
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id as BannerData['template'])}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedTemplate === template.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {analysisResult && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <h2 className="text-xl font-semibold text-gray-900">Analysis Complete</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Extracted Content</h3>
                  <p className="text-sm text-gray-600 mb-2"><strong>Title:</strong> {analysisResult.title}</p>
                  <p className="text-sm text-gray-600 mb-2"><strong>Description:</strong> {analysisResult.description}</p>
                  {analysisResult.keywords.length > 0 && (
                    <p className="text-sm text-gray-600"><strong>Keywords:</strong> {analysisResult.keywords.join(', ')}</p>
                  )}
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Color Palette</h3>
                  <div className="flex gap-2">
                    {analysisResult.colors.map((color, index) => (
                      <div
                        key={index}
                        className="w-8 h-8 rounded-lg border border-gray-200"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Banner Preview and Download */}
          {svgContent && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <h2 className="text-xl font-semibold text-gray-900">Your AI-Generated Banner is Ready!</h2>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={downloadSVG}
                    className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    SVG
                  </button>
                  <button
                    onClick={downloadPNG}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    PNG
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-6 overflow-hidden">
                <div className="max-w-full overflow-x-auto">
                  <div 
                    className="mx-auto border border-gray-200 rounded-lg overflow-hidden shadow-sm"
                    style={{ width: '600px', height: '315px' }}
                    dangerouslySetInnerHTML={{ 
                      __html: svgContent.replace('width="1200"', 'width="600"').replace('height="630"', 'height="315"')
                    }}
                  />
                </div>
                <p className="text-sm text-gray-600 text-center mt-4">
                  Preview scaled to 50% • Full size: 1200×630px • Generated by Claude AI
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;