import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Port configuration: Replit=5000, Google AI Studio=3000, Local=3000
// See PORT_RULES.md for details
const PORT = process.env.PORT || (process.env.REPL_ID ? 5000 : 3000);

// Serve static assets and html files from the project root
app.use(express.static(__dirname, { extensions: ['html'] }));

// AI Enhancement endpoint
app.get('/api/enhance', async (req, res) => {
  const { car, mode } = req.query;

  // Validate inputs
  if (!car || !mode) {
    return res.status(400).json({ error: 'Missing car or mode parameter' });
  }

  // Fallback presets
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

  const prompt = `You are an AI image enhancement expert. For a ${car} in ${mode} style, generate ONLY a JSON response with exactly this format:
{
  "filter": "css-filter-string-here",
  "description": "2-sentence description of the visual effect"
}
Do not include any other text, markdown, or explanations. Just the JSON object.`;

  // 1. Try Groq if API key is provided
  if (process.env.GROQ_API_KEY) {
    try {
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama-3.2-11b",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.8,
          max_tokens: 150
        })
      });

      if (groqResponse.ok) {
        const data = await groqResponse.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
          const content = data.choices[0].message.content;
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.filter && parsed.description) {
              return res.json(parsed);
            }
          }
        }
      }
    } catch (err) {
      console.error('Groq API Error:', err);
    }
  }

  // 2. Try Gemini if GEMINI_API_KEY is provided
  if (process.env.GEMINI_API_KEY) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed.filter && parsed.description) {
            return res.json(parsed);
          }
        }
      }
    } catch (err) {
      console.error('Gemini API Error:', err);
    }
  }

  // Use reliable preset fallback
  res.json(presets[mode] || presets.dark);
});

// Catch-all route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
