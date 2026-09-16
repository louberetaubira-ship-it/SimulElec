/**
 * Feuille PDF des identifiants d'une classe, à imprimer, découper et distribuer.
 * Une vignette par élève : nom, identifiant, mot de passe, code classe.
 * Généré côté navigateur (jsPDF) : les mots de passe ne transitent pas ailleurs.
 */
import { jsPDF } from 'jspdf';

export interface IdentifiantEleve {
  last_name: string;
  first_name: string;
  login: string;
  password: string;
}

export function telechargerIdentifiantsPdf(
  className: string,
  classCode: string | null,
  eleves: IdentifiantEleve[],
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 12;
  const gap = 6;
  const cols = 2;
  const cardW = (pageW - 2 * margin - (cols - 1) * gap) / cols;
  const cardH = 34;
  const startY = 26;

  function header(): void {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`Identifiants SimulElec — ${className}`, margin, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(110);
    const code = classCode ? `Code classe : ${classCode}  ·  ` : '';
    doc.text(`${code}simul-elec.vercel.app  ·  à découper et remettre à chaque élève`, margin, 21);
    doc.setTextColor(0);
    doc.setDrawColor(30);
    doc.setLineWidth(0.4);
    doc.line(margin, 23, pageW - margin, 23);
  }

  header();
  let x = margin;
  let y = startY;
  let col = 0;

  eleves.forEach((e) => {
    if (y + cardH > pageH - margin) {
      doc.addPage();
      header();
      x = margin; y = startY; col = 0;
    }
    // cadre pointillé
    doc.setDrawColor(170);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([1, 1], 0);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'S');
    doc.setLineDashPattern([], 0);

    const px = x + 5;
    let py = y + 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20);
    doc.text(`${e.last_name} ${e.first_name}`.trim(), px, py);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(90);
    py += 8;
    doc.text('Identifiant', px, py);
    doc.setFont('courier', 'bold');
    doc.setTextColor(20);
    doc.text(e.login, px + 24, py);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90);
    py += 6.5;
    doc.text('Mot de passe', px, py);
    doc.setFont('courier', 'bold');
    doc.setTextColor(20);
    doc.text(e.password, px + 24, py);

    if (classCode) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(90);
      py += 6.5;
      doc.text('Classe', px, py);
      doc.setFont('courier', 'bold');
      doc.setTextColor(20);
      doc.text(classCode, px + 24, py);
    }

    col += 1;
    if (col >= cols) { col = 0; x = margin; y += cardH + gap; }
    else { x += cardW + gap; }
  });

  const safe = className.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'classe';
  doc.save(`identifiants-${safe}.pdf`);
}
