import {
    getCurrentMembre,
    resolvePermissions,
} from "@/lib/auth/server-permissions"

export async function GET() {
    const membre = await getCurrentMembre()
    if (!membre) {
        return Response.json({ membre: null, permissions: null }, { status: 200 })
    }
    const { codeAccesHash: _unused, ...safeMembre } = membre
    return Response.json({
        membre: { ...safeMembre, codeAcces: "•••-•••-••••" },
        permissions: resolvePermissions(membre),
    })
}
