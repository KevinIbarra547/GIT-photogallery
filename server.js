const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// API endpoint to get AI description for an image
app.get('/api/describe', async (req, res) => {
  const { imageUrl } = req.query;
  
  if (!imageUrl) {
    return res.status(400).json({ 
      title: "Error", 
      description: "Missing image URL parameter." 
    });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        title: "Server Error", 
        description: "Groq API key not configured." 
      });
    }

    const response = await fetch('https://api.groq.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: [{
          role: "user",
          content: `Analyze this image: ${imageUrl}. Return ONLY a JSON object with exactly this format: {"title": "short title", "description": "2-3 sentence description"}. Do not add any other text.`
        }],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Try to parse JSON from the response
    try {
      // Clean up the response to extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return res.json({
          title: parsed.title || "Image",
          description: parsed.description || "No description available."
        });
      }
    } catch (e) {
      console.log("Could not parse JSON, using fallback:", content);
    }

    // Fallback: split by newlines
    const lines = content.split('\n').filter(l => l.trim());
    return res.json({
      title: lines[0] || "Untitled",
      description: lines.slice(1).join(' ') || "No description available."
    });

  } catch (error) {
    console.error('Groq API error:', error);
    return res.status(500).json({ 
      title: "Error", 
      description: "Failed to generate description. Please try again." 
    });
  }
});

// Fallback for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
