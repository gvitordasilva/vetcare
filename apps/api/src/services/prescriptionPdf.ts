/**
 * Geração de PDF de prescrição veterinária usando pdf-lib.
 *
 * O documento inclui:
 *   - Cabeçalho com dados da clínica
 *   - Identificação do paciente e tutor
 *   - Tabela de medicamentos
 *   - Área de assinatura do veterinário
 *   - QR code para verificação de autenticidade
 *   - Código de verificação único (hash SHA-256 truncado)
 *
 * Nota: prescrições com medicamentos controlados requerem assinatura
 * digital ICP-Brasil (Receituário B). Este PDF é válido para receituários
 * simples (veterinários) conforme Resolução CFMV nº 1.015/2012.
 */

import { PDFDocument, PDFFont, rgb, StandardFonts, degrees } from 'pdf-lib'
import QRCode from 'qrcode'
import crypto from 'node:crypto'

export interface PrescriptionData {
  verificationUrl: string    // URL pública de verificação (ex: https://app.vetcare.com/verify/...)
  verificationCode: string   // código único de 8 chars exibido no rodapé

  clinic: {
    name:    string
    address: string
    city:    string
    state:   string
    phone:   string
    cnpj?:   string
  }
  patient: {
    name:    string
    species: string
    breed:   string
    age?:    string
    weight?: number
  }
  owner: {
    name:  string
    phone: string
    cpf?:  string
  }
  vet: {
    name:  string
    crmv:  string   // CRMV-UF número
  }
  date: Date
  medications: {
    name:         string
    concentration?: string
    form?:        string    // comprimido, solução, etc.
    quantity:     string
    instructions: string    // posologia
    duration:     string
  }[]
  notes?: string
}

/** Gera um código de verificação único a partir dos dados da prescrição */
export function generateVerificationCode(consultationId: string, vetId: string, date: Date): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${consultationId}-${vetId}-${date.toISOString()}`)
    .digest('hex')
  return hash.substring(0, 8).toUpperCase()
}

export async function generatePrescriptionPdf(data: PrescriptionData): Promise<Buffer> {
  const doc  = await PDFDocument.create()
  const page = doc.addPage([595, 842]) // A4

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold    = await doc.embedFont(StandardFonts.HelveticaBold)

  const { width, height } = page.getSize()
  const margin = 48
  const green  = rgb(0.09, 0.64, 0.26)  // #16a34a
  const gray   = rgb(0.4, 0.4, 0.4)
  const black  = rgb(0, 0, 0)
  const lightGray = rgb(0.92, 0.92, 0.92)

  let y = height - margin

  // ── Cabeçalho ─────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: green })

  // Nome da clínica
  page.drawText('PRESCRIÇÃO VETERINÁRIA', {
    x: margin, y: height - 30,
    size: 14, font: fontBold, color: rgb(1, 1, 1),
  })
  page.drawText(data.clinic.name, {
    x: margin, y: height - 50,
    size: 10, font: fontRegular, color: rgb(0.9, 0.9, 0.9),
  })
  page.drawText(`${data.clinic.address} — ${data.clinic.city}/${data.clinic.state} | ${data.clinic.phone}`, {
    x: margin, y: height - 65,
    size: 8, font: fontRegular, color: rgb(0.8, 0.8, 0.8),
  })

  y = height - 100

  // ── Data e código ─────────────────────────────────────────────────
  const dateStr = data.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  page.drawText(dateStr, {
    x: margin, y,
    size: 9, font: fontRegular, color: gray,
  })
  page.drawText(`Cód: ${data.verificationCode}`, {
    x: width - margin - 80, y,
    size: 9, font: fontBold, color: gray,
  })

  y -= 16
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: lightGray })
  y -= 16

  // ── Dados do paciente ─────────────────────────────────────────────
  page.drawText('PACIENTE', { x: margin, y, size: 8, font: fontBold, color: green })
  y -= 14

  const patientRow = [
    `Nome: ${data.patient.name}`,
    `Espécie: ${data.patient.species}`,
    `Raça: ${data.patient.breed}`,
    data.patient.age ? `Idade: ${data.patient.age}` : '',
    data.patient.weight ? `Peso: ${data.patient.weight} kg` : '',
  ].filter(Boolean).join('   |   ')

  page.drawText(patientRow, { x: margin, y, size: 9, font: fontRegular, color: black })
  y -= 12

  page.drawText(`Tutor: ${data.owner.name}   |   Tel: ${data.owner.phone}${data.owner.cpf ? `   |   CPF: ${data.owner.cpf}` : ''}`, {
    x: margin, y, size: 9, font: fontRegular, color: black,
  })

  y -= 16
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: lightGray })
  y -= 20

  // ── Título Rx ─────────────────────────────────────────────────────
  page.drawText('Rp.', { x: margin, y, size: 22, font: fontBold, color: green })
  y -= 30

  // ── Medicamentos ──────────────────────────────────────────────────
  for (let i = 0; i < data.medications.length; i++) {
    const med = data.medications[i]

    // Linha zebrada de fundo
    if (i % 2 === 0) {
      page.drawRectangle({
        x: margin - 4, y: y - 40,
        width: width - 2 * margin + 8, height: 52,
        color: rgb(0.97, 0.99, 0.97),
      })
    }

    // Nome + concentração
    const medTitle = [med.name, med.concentration, med.form].filter(Boolean).join(' ')
    page.drawText(`${i + 1}. ${medTitle}`, {
      x: margin, y, size: 11, font: fontBold, color: black,
    })
    y -= 14

    page.drawText(`Quantidade: ${med.quantity}`, {
      x: margin + 12, y, size: 9, font: fontRegular, color: black,
    })
    y -= 12

    page.drawText(med.instructions, {
      x: margin + 12, y, size: 9, font: fontRegular, color: black,
    })
    y -= 12

    page.drawText(`Duração: ${med.duration}`, {
      x: margin + 12, y, size: 9, font: fontRegular, color: gray,
    })
    y -= 24

    if (y < 200) {
      // Nova página se necessário
      const newPage = doc.addPage([595, 842])
      y = height - margin
    }
  }

  // ── Observações ───────────────────────────────────────────────────
  if (data.notes) {
    y -= 8
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: lightGray })
    y -= 14
    page.drawText('Observações:', { x: margin, y, size: 8, font: fontBold, color: gray })
    y -= 12
    page.drawText(data.notes, { x: margin, y, size: 9, font: fontRegular, color: black })
    y -= 20
  }

  // ── Área de assinatura ────────────────────────────────────────────
  const signY = 160
  page.drawLine({ start: { x: margin, y: signY + 30 }, end: { x: margin + 200, y: signY + 30 }, thickness: 0.5, color: black })
  page.drawText(data.vet.name, { x: margin, y: signY + 14, size: 9, font: fontBold, color: black })
  page.drawText(`CRMV ${data.vet.crmv}`, { x: margin, y: signY + 2, size: 8, font: fontRegular, color: gray })
  page.drawText('Médico(a) Veterinário(a)', { x: margin, y: signY - 10, size: 7, font: fontRegular, color: gray })

  // ── QR Code de verificação ────────────────────────────────────────
  try {
    const qrDataUrl = await QRCode.toDataURL(data.verificationUrl, {
      width: 80, margin: 1, errorCorrectionLevel: 'M',
    })
    const qrBase64  = qrDataUrl.split(',')[1]
    const qrImage   = await doc.embedPng(Buffer.from(qrBase64, 'base64'))

    const qrX = width - margin - 80
    const qrY = 100
    page.drawImage(qrImage, { x: qrX, y: qrY, width: 80, height: 80 })
    page.drawText('Verifique a autenticidade', { x: qrX, y: qrY - 12, size: 7, font: fontRegular, color: gray })
    page.drawText(data.verificationCode, { x: qrX + 12, y: qrY - 22, size: 9, font: fontBold, color: green })
  } catch {
    // QR code opcional — falha silenciosa
  }

  // ── Rodapé ────────────────────────────────────────────────────────
  page.drawLine({ start: { x: margin, y: 70 }, end: { x: width - margin, y: 70 }, thickness: 0.5, color: lightGray })
  page.drawText(
    'Documento gerado eletronicamente. Válido conforme Resolução CFMV nº 1.015/2012.',
    { x: margin, y: 56, size: 7, font: fontRegular, color: gray }
  )
  page.drawText(
    `Verifique em: ${data.verificationUrl}`,
    { x: margin, y: 44, size: 7, font: fontRegular, color: gray }
  )

  // Marca d'água diagonal
  page.drawText('PRESCRIÇÃO VETERINÁRIA', {
    x: 100, y: 350,
    size: 40, font: fontBold,
    color: rgb(0.9, 0.9, 0.9),
    rotate: degrees(45),
    opacity: 0.15,
  })

  const pdfBytes = await doc.save()
  return Buffer.from(pdfBytes)
}
