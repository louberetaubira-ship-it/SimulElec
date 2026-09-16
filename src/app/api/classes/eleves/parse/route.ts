/**
 * Extraction de la liste d'élèves d'un fichier importé par le professeur.
 * Accepte un PDF Pronote, un CSV ou un Excel (.xlsx) et renvoie la liste
 * `[{ last_name, first_name }]`. Aucun compte n'est créé ici : le professeur
 * vérifie d'abord la liste, puis lance la création (route `import`).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { fail, requireTeacher } from '@/lib/api/auth';
import { pdfTextToStudents, rowsToStudents, type EleveImporte } from '@/lib/importClasse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo : large pour une liste de classe

export async function POST(request: NextRequest) {
  const caller = await requireTeacher();
  if (caller instanceof NextResponse) return caller;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('Fichier illisible.', 400);
  }
  const file = form.get('file');
  if (!(file instanceof File)) return fail('Aucun fichier reçu.', 400);
  if (file.size > MAX_BYTES) return fail('Fichier trop volumineux (max 5 Mo).', 413);

  const name = file.name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());

  let eleves: EleveImporte[] = [];
  try {
    if (name.endsWith('.pdf') || file.type === 'application/pdf') {
      // Import de la lib par son sous-chemin : évite le code de test de l'index.
      const { default: pdf } = await import('pdf-parse/lib/pdf-parse.js');
      const parsed = await pdf(buf);
      eleves = pdfTextToStudents(parsed.text);
    } else if (
      name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv') ||
      file.type.includes('spreadsheet') || file.type.includes('excel') || file.type === 'text/csv'
    ) {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(buf, { type: 'buffer' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
      eleves = rowsToStudents(rows);
    } else {
      return fail('Format non reconnu : dépose un PDF, un CSV ou un Excel (.xlsx).', 415);
    }
  } catch (e) {
    return fail('Lecture du fichier impossible : ' + (e instanceof Error ? e.message : 'erreur'), 500);
  }

  if (!eleves.length) {
    return fail('Aucun élève détecté dans ce fichier. Vérifie qu\'il contient une colonne « Élève » (NOM Prénom).', 422);
  }
  return NextResponse.json({ eleves });
}
