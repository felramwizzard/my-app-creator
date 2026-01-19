import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Finance OS, an AI assistant for personal finance management. You help users understand their spending and provide financial insights.

CRITICAL RULES:
1. NEVER invent numbers or categories. ONLY use data provided in the context.
2. All amounts are in AUD.
3. Budget cycles run from the 15th to the 14th of each month (Australia/Sydney timezone).
4. Be concise and actionable in your responses.
5. ALWAYS respect the user's actual category assignments. Do NOT assume or reassign categories based on merchant names.
6. Only reference transactions and categories that exist in the provided context data.

When analyzing transactions:
- ONLY use the category names from the context - never invent category names like "dining out" unless they exist
- Identify spending patterns and trends based on ACTUAL category data provided
- Flag unusual or spike spending
- Provide safe-to-spend calculations based on actual data
- Recommend budget adjustments based on historical patterns

Category types:
- need: essentials the user must pay
- want: discretionary spending
- bucket: savings/goals`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Finance AI request:", { type, messageCount: messages?.length });

    let systemContent = SYSTEM_PROMPT;
    
    // Add context if provided
    if (context) {
      systemContent += `\n\nCURRENT CONTEXT:\n${JSON.stringify(context, null, 2)}`;
    }

    const body: Record<string, unknown> = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemContent },
        ...messages,
      ],
      stream: type === "chat",
    };

    // Add tool definitions for structured outputs
    if (type === "categorize") {
      body.tools = [
        {
          type: "function",
          function: {
            name: "categorize_transaction",
            description: "Suggest a category for a transaction based on the merchant/description",
            parameters: {
              type: "object",
              properties: {
                category_name: { type: "string", description: "Suggested category name" },
                category_type: { type: "string", enum: ["need", "want", "bucket"] },
                confidence: { type: "number", description: "Confidence score 0-1" },
                reasoning: { type: "string", description: "Brief explanation" }
              },
              required: ["category_name", "category_type", "confidence", "reasoning"],
              additionalProperties: false
            }
          }
        }
      ];
      body.tool_choice = { type: "function", function: { name: "categorize_transaction" } };
    }

    if (type === "insights") {
      body.tools = [
        {
          type: "function",
          function: {
            name: "generate_insights",
            description: "Generate financial insights from spending data",
            parameters: {
              type: "object",
              properties: {
                insights: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["warning", "tip", "observation", "recommendation"] },
                      title: { type: "string" },
                      description: { type: "string" },
                      priority: { type: "string", enum: ["high", "medium", "low"] }
                    },
                    required: ["type", "title", "description", "priority"],
                    additionalProperties: false
                  }
                }
              },
              required: ["insights"],
              additionalProperties: false
            }
          }
        }
      ];
      body.tool_choice = { type: "function", function: { name: "generate_insights" } };
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For streaming responses
    if (type === "chat") {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // For structured responses
    const data = await response.json();
    console.log("AI response received");
    
    // Extract tool call result if present
    if (data.choices?.[0]?.message?.tool_calls?.[0]) {
      const toolCall = data.choices[0].message.tool_calls[0];
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      content: data.choices?.[0]?.message?.content || "No response generated" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Finance AI error:", e);
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
