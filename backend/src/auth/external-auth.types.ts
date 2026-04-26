export type ExternalAuthProvider = "google" | "vk";

export interface VerifiedExternalIdentity {
  provider: ExternalAuthProvider;
  subject: string;
  email?: string | null;
  fullName: string;
  profile: Record<string, unknown>;
}
