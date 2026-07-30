export async function verifyAuth(request: Request) {
  // TODO: Implémenter la vraie vérification (NextAuth, Clerk, etc.)
  // Pour la démonstration, on retourne un rôle valide
  return {
    id: 'user_1',
    role: 'ASSOCIE_GERANT',
  };
}
