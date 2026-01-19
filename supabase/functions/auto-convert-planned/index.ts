import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Find all planned transactions where date <= today
    const { data: plannedTransactions, error: fetchError } = await supabase
      .from("transactions")
      .select("id, description, date")
      .eq("is_planned", true)
      .lte("date", today);

    if (fetchError) {
      throw fetchError;
    }

    if (!plannedTransactions || plannedTransactions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No planned transactions to convert", converted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update them to is_planned = false (marking as paid/actual)
    const { error: updateError } = await supabase
      .from("transactions")
      .update({ is_planned: false })
      .in("id", plannedTransactions.map(t => t.id));

    if (updateError) {
      throw updateError;
    }

    console.log(`Auto-converted ${plannedTransactions.length} planned transactions:`, 
      plannedTransactions.map(t => `${t.description} (${t.date})`));

    return new Response(
      JSON.stringify({ 
        message: "Successfully converted planned transactions", 
        converted: plannedTransactions.length,
        transactions: plannedTransactions.map(t => t.description)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error converting planned transactions:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
