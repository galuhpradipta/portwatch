export async function analyzeSentiment(
  title: string,
  description: string,
  apiKey: string,
): Promise<number> {
  const prompt = `Analyze the sentiment of this news article about a company. Return a single integer from 0 to 100 where 0 means very positive news and 100 means very negative news (layoffs, financial trouble, scandal, etc).

Title: ${title}
Description: ${description}

Respond with only the integer number, nothing else.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 10,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
  const content = data.choices[0]?.message?.content?.trim() ?? "50";
  const score = parseInt(content, 10);
  return isNaN(score) ? 50 : Math.max(0, Math.min(100, score));
}
