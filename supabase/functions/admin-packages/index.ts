import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-client@2"

declare const Deno: any;

const ADMIN_EMAILS = Deno.env.get("ADMIN_EMAILS")?.split(",") || [];

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization")!;
  
  // Koristimo anonimni ključ i JWT korisnika - RLS će obaviti ostalo
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  // Osnovna validacija JWT-a
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user || !ADMIN_EMAILS.includes(user.email!)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { 
      status: 401,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  // GET: Dohvatanje paketa (RLS filtrira na osnovu emaila)
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("product_packages")
      .select("*")
      .order("priority_weight", { ascending: false });
      
    if (error) return new Response(error.message, { status: 400 });
    return new Response(JSON.stringify(data), { 
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
    });
  }

  // POST: Upsert paketa (RLS dozvoljava samo ako je email u listi)
  if (req.method === "POST") {
    const body = await req.json();
    const { data, error } = await supabase
      .from("product_packages")
      .upsert(body)
      .select();
      
    if (error) return new Response(error.message, { status: 400 });
    return new Response(JSON.stringify(data), { 
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  return new Response("Method not allowed", { status: 405 });
})