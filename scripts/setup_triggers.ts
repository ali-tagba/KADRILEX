import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔒 Mise en place des Triggers PostgreSQL pour la Comptabilité...');

  // 1. Fonction pour vérifier l'équilibre (Débit = Crédit)
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION verifier_equilibre_ecriture()
    RETURNS TRIGGER AS $$
    DECLARE
      total_debit INTEGER;
      total_credit INTEGER;
    BEGIN
      -- On calcule le total pour l'écriture concernée
      SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
      INTO total_debit, total_credit
      FROM "LigneEcriture"
      WHERE "ecritureId" = COALESCE(NEW."ecritureId", OLD."ecritureId");

      IF total_debit != total_credit THEN
        RAISE EXCEPTION 'Déséquilibre comptable : Débit (%) != Crédit (%)', total_debit, total_credit;
      END IF;

      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Supprimer l'ancien trigger s'il existe
  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS trg_check_equilibre ON "LigneEcriture";
  `);

  // Créer le Constraint Trigger différé (s'exécute à la fin du COMMIT)
  await prisma.$executeRawUnsafe(`
    CREATE CONSTRAINT TRIGGER trg_check_equilibre
    AFTER INSERT OR UPDATE OR DELETE ON "LigneEcriture"
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION verifier_equilibre_ecriture();
  `);
  console.log("✅ Trigger d'équilibre des écritures (DEFERRED) installé.");

  // 2. Fonction pour bloquer la modification d'un exercice clôturé
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION verifier_exercice_cloture()
    RETURNS TRIGGER AS $$
    DECLARE
      is_cloture BOOLEAN;
    BEGIN
      SELECT cloture INTO is_cloture
      FROM "ExerciceComptable"
      WHERE id = (
        SELECT "exerciceId" FROM "Ecriture" WHERE id = COALESCE(NEW."ecritureId", OLD."ecritureId")
      );

      IF is_cloture THEN
        RAISE EXCEPTION 'Impossible de modifier une ligne : l''exercice comptable est clôturé.';
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS trg_check_cloture ON "LigneEcriture";
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_check_cloture
    BEFORE INSERT OR UPDATE OR DELETE ON "LigneEcriture"
    FOR EACH ROW
    EXECUTE FUNCTION verifier_exercice_cloture();
  `);
  
  console.log("✅ Trigger de verrouillage d'exercice installé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
