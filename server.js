const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (HTML, CSS, images)
app.use(express.static(path.join(__dirname)));

// AI Enhancement endpoint
app.get('/api/enhance', async (req, res) => {
  const { car, mode } = req.query;
  
  // Validate inputs
  if (!car || !mode) {
    return res.status(400).json({ error: 'Missing car or mode parameter' });
  }
  
  // Define the prompt for Groq
  const prompt = `You are an AI image enhancement expert. For a ${car} in ${mode} style, generate ONLY a JSON response with exactly this format:
{
  "filter": "css-filter-string-here",
  "description": "2-sentence description of the visual effect"
}
Do not include any other text, markdown, or explanations. Just the JSON object.`;
  
  try {
    // Call Groq API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.2-11b",
        messages: [
          { 
            role: "user", 
            content: prompt 
          }
        ],
        temperature: 0.8,
        max_tokens: 150
      })
    });
    
    const data = await groqResponse.json();
    
    // Extract the JSON from the response
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.filter && parsed.description) {
            return res.json(parsed);
          }
        } catch (e) {
          console.log("JSON parse error:", e);
        }
      }
    }
    
    // If we get here, the response wasn't valid - use fallback
    console.log("Groq response didn't contain valid JSON, using fallback");
    
  } catch (err) {
    console.error('Groq API Error:', err);
  }
  
  // Fallback presets if Groq fails or returns invalid data
  const presets = {
    dark: { 
      filter: "brightness(0.7) contrast(1.3) saturate(1.2)", 
      description: "Dark cinematic enhancement with deep shadows and accentuated highlights." 
    },
    light: { 
      filter: "brightness(1.2) contrast(0.9) saturate(0.95)", 
      description: "Bright, natural lighting effect with soft, airy tones." 
    },
    modern: { 
      filter: "brightness(1.1) contrast(1.2) saturate(1.5)", 
      description: "Vibrant, futuristic color boost with sharp, crisp edges." 
    },
    old: { 
      filter: "sepia(0.8) brightness(0.95) saturate(0.7)", 
      description: "Vintage film effect with warm sepia tones and reduced saturation." 
    }
  };
  
  res.json(presets[mode] || presets.dark);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
