import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function plain(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

/**
 * Open a resume file. Row level security decides whether the viewer may see
 * the resume (its owner, recruiters it was shared with through an
 * application, or anyone allowed to see a public resume); the file is then
 * served through a short-lived signed URL.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) {
    const login = new URL("/auth/login", request.url);
    return NextResponse.redirect(login);
  }
  if (!UUID_RE.test(id)) return plain("Resume not found.", 404);

  const { data: resume, error } = await supabase.from("resumes").select("file_path, file_name").eq("id", id).maybeSingle();
  if (error) return plain("Could not load this resume.", 500);
  if (!resume) return plain("This resume doesn't exist or you don't have permission to view it.", 404);

  const { data: signed, error: signError } = await supabase.storage
    .from("resumes")
    .createSignedUrl(resume.file_path, 60);
  if (signError || !signed?.signedUrl) return plain("You don't have permission to open this file.", 403);

  const response = NextResponse.redirect(signed.signedUrl);
  response.headers.set("cache-control", "no-store");
  return response;
}
