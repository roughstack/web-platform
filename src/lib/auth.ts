// Auth is not yet wired (Phase 3). This stub exists so the submission API has
// a place to call once real providers are configured. For now, submissions are
// anonymous and userId is null on the Submission record.
//
// When GitHub/Google OAuth is added, this file will export an `auth` function
// and a signIn/signOut handler using the NextAuth v5 API, and the submission
// routes will call `auth()` to get the server session.

export interface ServerSession {
  user?: { id: string };
}

export async function getServerSession(): Promise<ServerSession | null> {
  return null;
}
