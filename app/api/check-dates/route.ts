import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const dossiers = await prisma.dossier.findMany({
            select: { numero: true, dateOuverture: true },
            take: 5
        });
        const clients = await prisma.client.findMany({
            select: { numeroClient: true, createdAt: true },
            take: 5
        });
        return NextResponse.json({ dossiers, clients });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
