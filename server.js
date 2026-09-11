require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
const cors = require('cors');
app.use(cors());

// Serve all static files from the current directory
app.use(express.static(path.join(__dirname, '.')));

// Fallback descriptions for known images
const fallbackDescriptions = {
  'serene-alpine-lake-vista': {
    title: 'Serene Alpine Lake Vista',
    description: 'A breathtaking view of a crystal-clear alpine lake surrounded by majestic snow-capped mountains. The mirror-like water reflects the towering peaks and the vibrant blue sky above.'
  },
  'student-writing-at-desk': {
    title: 'Student Writing at Desk',
    description: 'A focused student sitting at a wooden desk, diligently writing in a notebook. The scene captures the essence of learning and concentration in a quiet study environment.'
  },
  'pizza': {
    title: 'Delicious Pizza',
    description: 'A mouth-watering pizza with golden, bubbly cheese and colorful toppings. Fresh from the oven, this classic dish is ready to be enjoyed.'
  },
  'sushi': {
    title: 'Fresh Sushi Platter',
    description: 'An elegant arrangement of fresh sushi rolls and sashimi on a wooden platter. The vibrant colors and delicate presentation showcase the art of Japanese cuisine.'
  },
  'airplane': {
    title: 'Modern Airplane',
    description: 'A sleek commercial airplane soaring through the sky. This marvel of modern engineering connects people and places across the globe.'
  },
  'mountain': {
    title: 'Majestic Mountain',
    description: 'A towering mountain peak reaching toward the heavens. The rugged terrain and natural beauty inspire awe and adventure.'
  },
  'beach': {
    title: 'Tropical Beach',
    description: 'A serene tropical beach with soft white sand and crystal-clear turquoise waters. Palm trees sway gently in the breeze, creating a perfect paradise getaway.'
  },
  'birds-at-mono-lake': {
    title: 'Birds at Mono Lake',
    description: 'A stunning landscape of Mono Lake with its unique tufa towers and a flock of birds in flight. The alkaline waters and dramatic sky create a surreal, otherworldly scene.'
  },
  'forest': {
    title: 'Lush Forest',
    description: 'A dense, verdant forest filled with tall trees and rich undergrowth. The dappled sunlight filters through the canopy, creating a peaceful, natural sanctuary.'
  },
  'big-sur': {
    title: 'Big Sur Coastline',
    description: 'The dramatic coastline of Big Sur, California, featuring rugged cliffs plunging into the Pacific Ocean. A scenic highway winds along the edge, offering spectacular views.'
  },
  'school': {
    title: 'Modern School Building',
    description: 'A contemporary school building with clean architectural lines and large windows. A yellow school bus waits nearby, ready to transport students to and from their classes.'
  }
};

// Helper to extract image key from URL
function getImageKey(imageUrl) {
  try {
    const urlObj = new URL(imageUrl);
    const pathname = urlObj.pathname.toLowerCase();
    const filename = path.basename(pathname, path.extname(pathname));
    
    // Check for known patterns
    if (filename.includes('serene') || filename.includes('alpine') || filename.includes('lake') || filename.includes('vista')) {
      return 'serene-alpine-lake-vista';
    }
    if (filename.includes('student') || filename.includes('writing') || filename.includes('desk') || filename.includes('homework')) {
      return 'student-writing-at-desk';
    }
    if (filename.includes('pizza')) return 'pizza';
    if (filename.includes('sushi')) return 'sushi';
    if (filename.includes('airplane') || filename.includes('plane')) return 'airplane';
    if (filename.includes('mountain')) return 'mountain';
    if (filename.includes('beach')) return 'beach';
    if (filename.includes('bird') || filename.includes('mono')) return 'birds-at-mono-lake';
    if (filename.includes('forest')) return 'forest';
    if (filename.includes('big-sur') || filename.includes('bigsur')) return 'big-sur';
    if (filename.includes('school') || filename.includes('building') || filename.includes('bus')) return 'school';
    
    return null;
  } catch (e) {
    return null;
  }
}

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
    const imageKey = getImageKey(imageUrl);
    const staticFallback = imageKey ? fallbackDescriptions[imageKey] : null;
    
    // If no API key, return static fallback
    if (!apiKey) {
      console.warn('GROQ_API_KEY is not set. Using static fallback descriptions.');
      if (staticFallback) {
        return res.json(staticFallback);
      }
      return res.status(500).json({ 
        title: "Serene Landscape", 
        description: "A beautiful image from the photo gallery. The server is configured with static descriptions for known images." 
      });
    }

    // Use vision-capable model
    const response = await fetch('https://api.groq.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview",
        messages: [{
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl }
            },
            {
              type: "text",
              text: "Create a short, creative title (3-5 words) and a vivid description (2-3 sentences) for this image. Return ONLY a valid JSON object with exactly this format: {\"title\": \"your title here\", \"description\": \"your description here\"}. Do not include any other text, markdown, or code blocks."
            }
          ]
        }],
        temperature: 0.8,
        max_tokens: 150,
      }),
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      console.error('Groq API returned no choices');
      if (staticFallback) {
        return res.json(staticFallback);
      }
      return res.status(500).json({ 
        title: "Serene Landscape", 
        description: "A beautiful image from the photo gallery." 
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
    const imageKey = getImageKey(imageUrl);
    const staticFallback = imageKey ? fallbackDescriptions[imageKey] : null;
    
    if (staticFallback) {
      return res.json(staticFallback);
    }
    
    return res.status(500).json({ 
      title: "Serene Landscape", 
      description: "A beautiful image from the photo gallery. The AI description service is temporarily unavailable." 
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
