import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default async function JournalDetailsPage({ params }: { params: { id: string } }) {
  const journal = await prisma.journalComptable.findUnique({
    where: { id: params.id },
    include: {
      ecritures: {
        include: {
          lignes: {
            include: { compte: true }
          }
        },
        orderBy: { dateEcriture: 'desc' }
      }
    }
  })

  if (!journal) {
    notFound()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Journal: {journal.libelle} ({journal.code})
          </h1>
          <p className="text-gray-500 mt-2">Historique des écritures comptables</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Libellé</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pièce / Réf</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Débit</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Crédit</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {journal.ecritures.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">Aucune écriture dans ce journal</td>
              </tr>
            ) : (
              journal.ecritures.map((ecriture) => (
                <tr key={ecriture.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {format(new Date(ecriture.dateEcriture), 'dd/MM/yyyy', { locale: fr })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    <div className="font-medium">{ecriture.libelle}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {ecriture.lignes.map(l => (
                        <div key={l.id}>{l.compte.numero} - {l.compte.libelle}</div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ecriture.numeroPiece || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                    {ecriture.lignes.reduce((sum, l) => sum + l.debit, 0).toLocaleString()} F
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                    {ecriture.lignes.reduce((sum, l) => sum + l.credit, 0).toLocaleString()} F
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
