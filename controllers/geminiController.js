const dotenv = require('dotenv');
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE';

const proxyGemini = async (req, res) => {
    const { message, userContext } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        return res.status(500).json({ error: 'Gemini API key not configured. Set GEMINI_API_KEY environment variable.' });
    }

    const systemPrompt = `You are APEX AI, a fitness assistant chatbot for the APEX fitness app. You help users with:
- Fitness queries, exercise explanations, workout suggestions
- Diet and nutrition advice
- Habit tracking commands
- You understand both English and Telugu (తెలుగు)

User context: ${JSON.stringify(userContext || {})}

IMPORTANT: If the user sends a command to mark a habit or meal as completed, respond with a JSON action block like:
{"action": "mark_habit", "habit": "Morning Workout"} or {"action": "log_meal", "meal": "Breakfast", "calories": 400, "protein": 20}

Always be encouraging, friendly, and knowledgeable. Keep responses concise but helpful.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    { role: 'user', parts: [{ text: systemPrompt + '\n\nUser message: ' + message }] }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 500
                }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('Gemini API error:', err);
            return res.status(500).json({ error: 'Failed to get AI response' });
        }

        const data = await response.json();
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';

        // Check if there's an action embedded in the response
        let action = null;
        const actionMatch = aiText.match(/\{"action":\s*"[^"]+"/);
        if (actionMatch) {
            try {
                const jsonStart = aiText.indexOf('{');
                const jsonEnd = aiText.lastIndexOf('}') + 1;
                action = JSON.parse(aiText.substring(jsonStart, jsonEnd));
            } catch (e) { /* ignore parse errors */ }
        }

        // Only premium users can get actions processed automatically by AI
        if (action && (!req.user || req.user.plan === 'free')) {
            return res.json({ reply: aiText + '\n\n*(Automated logging is a Premium feature)*', action: null });
        }

        res.json({ reply: aiText, action });
    } catch (err) {
        console.error('Gemini proxy error:', err);
        res.status(500).json({ error: 'Failed to connect to AI service' });
    }
};

module.exports = { proxyGemini };
