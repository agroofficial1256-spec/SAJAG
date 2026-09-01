import type { Config } from "@netlify/functions";
import OpenAI from "openai";

const MAX_QUESTION_LENGTH = 1200;

export default async (request: Request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  try {
    const body = await request.json();
    const question = typeof body?.question === "string" ? body.question.trim() : "";

    if (!question) {
      return Response.json({ error: "Please enter a question." }, { status: 400 });
    }

    if (question.length > MAX_QUESTION_LENGTH) {
      return Response.json(
        { error: "Please keep the question under 1,200 characters." },
        { status: 400 },
      );
    }

    const openai = new OpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "Answer helpfully and politely. Be direct and practical. Use 2 to 4 short sentences. Avoid long paragraphs, filler, headings, and unnecessary detail. If steps are essential, use at most 3 brief numbered steps. If the user may be in immediate danger, advise contacting local emergency services.",
        },
        { role: "user", content: question },
      ],
      max_tokens: 180,
    });

    const answer = response.choices[0]?.message.content?.trim() || "";
    return Response.json({ answer: answer || "I could not form a useful answer. Please try again." });
  } catch (error) {
    console.error("AI Gateway request failed", error instanceof Error ? error.message : "Unknown error");
    return Response.json(
      { error: "The helper is resting for a moment. Please try again shortly." },
      { status: 500 },
    );
  }
};

export const config: Config = {
  path: "/api/ask",
  method: "POST",
};