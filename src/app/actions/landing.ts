"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface ContactFormData {
  name: string;
  company: string;
  email: string;
  phone: string;
  message: string;
}

export async function submitContactFormAction(
  data: ContactFormData
): Promise<{ error?: string }> {
  if (!data.name.trim() || !data.email.trim() || !data.message.trim()) {
    return { error: "Required fields missing." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("contact_requests").insert({
    name: data.name.trim(),
    company: data.company.trim() || null,
    email: data.email.trim(),
    phone: data.phone.trim() || null,
    message: data.message.trim(),
  });

  if (error) return { error: error.message };
  return {};
}
