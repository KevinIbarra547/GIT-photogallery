const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve all static files from the current directory
app.use(express.static(path.join(__dirname, '.')));

// API endpoint to generate title and description using Groq
app.get('/api/describe', async (req, res) => {
  const { imageUrl } = req.query;
  
  if (!imageUrl) {
    return res.status(400).json({ 
      title: "Error", 
      description: "No image URL provided." 
    });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        title: "Server Configuration Error", 
        description: "Groq API key is not set in the server environment." 
      });
    }

    // Extract hints from the URL for better prompts
    const urlObj = new URL(imageUrl);
    const pathname = urlObj.pathname;
    const filename = path.basename(pathname, path.extname(pathname));
    
    // Build a descriptive prompt using URL hints
    const imageHints = [];
    if (filename.includes('Big-Sur') || filename.includes('big-sur')) {
      imageHints.push("This is an image of Big Sur, a scenic coastline in California with dramatic cliffs and ocean views.");
    } else if (filename.includes('homework') || filename.includes('student') || filename.includes('desk')) {
      imageHints.push("This is an illustration of a student writing at a desk.");
    } else if (filename.includes('alpine') || filename.includes('lake') || filename.includes('mountain')) {
      imageHints.push("This is an image of an alpine lake with mountains, clear water, and natural scenery.");
    } else if (filename.includes('school') || filename.includes('building') || filename.includes('bus')) {
      imageHints.push("This is an image of a modern school building, possibly with a bus.");
    } else if (filename.includes('pizza')) {
      imageHints.push("This is an image of pizza.");
    } else if (filename.includes('sushi')) {
      imageHints.push("This is an image of sushi.");
    } else if (filename.includes('airplane') || filename.includes('plane')) {
      imageHints.push("This is an image of an airplane.");
    } else if (filename.includes('mountain')) {
      imageHints.push("This is an image of mountains.");
    } else if (filename.includes('beach')) {
      imageHints.push("This is an image of a beach.");
    } else if (filename.includes('bird') || filename.includes('mono') || filename.includes('lake')) {
      imageHints.push("This is an image of birds at Mono Lake.");
    } else if (filename.includes('forest')) {
      imageHints.push("This is an image of a forest.");
    }

    const hintText = imageHints.length > 0 ? imageHints[0] : "This is an image from a photo gallery.";

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
          content: `${hintText} Create a short, creative title (3-5 words) and a vivid description (2-3 sentences) for this image. Return ONLY a valid JSON object with exactly this format: {"title": "your title here", "description": "your description here"}. Do not include any other text, markdown, or code blocks.`
        }],
        temperature: 0.8,
        max_tokens: 150,
      }),
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({ 
        title: "API Error", 
        description: "The AI service returned an unexpected response." 
      });
    }

    const content = data.choices[0].message.content;
    
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.title && parsed.description) {
          return res.json({
            title: parsed.title,
            description: parsed.description
          });
        }
      } catch (e) {
        console.log("JSON parse error:", e);
      }
    }

    // Fallback: try to parse as title on first line, description on rest
    const lines = content.split('\n').filter(l => l.trim());
    const fallbackTitle = lines[0] || "Untitled Image";
    const fallbackDesc = lines.slice(1).join(' ') || "A beautiful image from the gallery.";
    
    return res.json({
      title: fallbackTitle,
      description: fallbackDesc
    });

  } catch (error) {
    console.error('Groq API Error:', error.message);
    return res.status(500).json({ 
      title: "Connection Error", 
      description: "Could not connect to the AI service. Please try again later." 
    });
  }
});

// Fallback: serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Static files served from: ${path.join(__dirname, '.')}`);
});
