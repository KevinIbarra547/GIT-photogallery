const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const app = express();

// Port configuration: Read from config/ai-port-rules.json
// This allows AI tools to know which port to use based on environment
let PORT = 5000; // Default fallback
try {
  const configPath = path.join(__dirname, 'config', 'ai-port-rules.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const defaultPort = config.default_port || 5000;
    
    // Apply rules: check REPL_ID first (Replit environment)
    if (process.env.REPL_ID) {
      const replitRule = config.rules.find(r => r.detect_by === 'REPL_ID');
      PORT = replitRule ? replitRule.port : 5000;
    } else {
      PORT = defaultPort;
    }
  }
} catch (err) {
  console.log('Using default port 5000, config file error:', err.message);
}

// Override with explicit PORT env var if in Replit
if (process.env.REPL_ID && process.env.PORT) {
  PORT = process.env.PORT;
}

// Serve static files with no-cache headers to prevent stale CSS / HTML in webviews
app.use(express.json());
app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
}));

// AI Enhancement endpoint
app.get('/api/enhance', async (req, res) => {
  const { car, mode } = req.query;

  // Validate inputs
  if (!car || !mode) {
    return res.status(400).json({ error: 'Missing car or mode parameter' });
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

  res.json(presets[mode] || presets.dark);
});

// AI Tuning Diagnostics & Acoustic Analysis endpoint
app.post('/api/tune-diagnostics', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  const { carName, stockSpecs = {}, tunedSpecs = {}, selectedMods = {} } = req.body || {};

  if (!carName) {
    return res.status(400).json({ error: 'Missing carName in request body' });
  }

  const stressScore = tunedSpecs.stressScore || 35;
  const hpGain = (tunedSpecs.hp || 0) - (stockSpecs.hp || 0);

  // Dynamic mechanical fallback based on car & stress metrics
  const defaultDiagnostics = {
    diagnosticVerdict: stressScore > 75 
      ? "Extreme Track Build - High Thermal Load" 
      : (stressScore > 45 ? "Aggressive Street Tune - High Output" : "Optimized OEM+ Street Profile"),
    reliabilityScore: Math.max(15, 100 - Math.round(stressScore * 0.9)),
    mechanicNotes: `With ${hpGain > 0 ? '+' + hpGain + ' HP' : 'stock output'} on the ${carName}, cylinder pressures are operating at ${stressScore > 60 ? 'peak internal tolerance' : 'balanced factory levels'}. ${selectedMods.forcedInduction && selectedMods.forcedInduction !== 'None' ? 'Turbo boost mapping requires high-octane 93+ fuel to prevent timing retardation under load.' : 'Naturally aspirated throttle response remains linear and predictable across the RPM band.'}`,
    acousticProfile: `${carName} with ${selectedMods.ecu || 'Stock ECU'}: Idle is clean and steady. Wide-open throttle generates ${stressScore > 60 ? 'aggressive exhaust overrun pops, rapid turbo wastegate flutter, and raw metallic induction bark' : 'a refined, deep induction tone with crisp mechanical harmony'} into the upper rev range.`,
    trackRecommendation: stressScore > 65 
      ? "Mandatory oil cooler upgrade, slotted front brake rotors, and DOT-4 racing brake fluid before aggressive track sessions." 
      : "Standard cooling loop is sufficient. Maintain cold tire pressures at 32 PSI for optimal lateral grip.",
    engineHealth: stressScore > 75 
      ? "Critical Strain (Forged Internals Advised)" 
      : (stressScore > 45 ? "Moderate Strain (Service every 3,000 miles)" : "Nominal (Factory Reliability)")
  };

  // If GROQ_API_KEY is available, query Groq for custom AI diagnostic appraisal
  if (process.env.GROQ_API_KEY) {
    try {
      const prompt = `You are a legendary Master Automotive Race Engineer and Chief Mechanic.
Analyze this custom tuned vehicle build:
Car: ${carName}
Stock Specs: ${JSON.stringify(stockSpecs)}
Tuned Specs: ${JSON.stringify(tunedSpecs)}
Selected Upgrades: ${JSON.stringify(selectedMods)}

Generate an authoritative diagnostic appraisal in STRICT JSON format with EXACTLY these keys:
{
  "diagnosticVerdict": "Short bold verdict (e.g., 'Track-Attack Weapon' or 'Balanced Fast Road Build')",
  "reliabilityScore": 78,
  "mechanicNotes": "2-3 precise, authentic mechanical sentences analyzing engine internals, boost, cooling, and power delivery.",
  "acousticProfile": "1-2 vivid sentences describing the exhaust timbre, intake sound, and turbo/supercharger noise.",
  "trackRecommendation": "1 practical actionable track prep recommendation.",
  "engineHealth": "One of: 'Nominal', 'Moderate Strain', or 'Critical Strain (Forged Internals Advised)'"
}
Output ONLY the raw JSON object without markdown fences, explanation, or extra characters.`;

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama-3.2-11b",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 350
        })
      });

      const data = await groqResponse.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.diagnosticVerdict && parsed.mechanicNotes) {
            return res.json(parsed);
          }
        }
      }
    } catch (err) {
      console.error('Groq Tuning Diagnostics Error:', err.message);
    }
  }

  // Fallback response
  return res.json(defaultDiagnostics);
});

// Catch-all route to serve index.html with no-cache headers
app.get('*', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
