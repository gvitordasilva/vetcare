import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

/**
 * Plugin de armazenamento de arquivos.
 *
 * Estratégia atual: filesystem local em UPLOAD_DIR (padrão: ./uploads).
 * Para produção, substitua saveFile() e getFileUrl() por chamadas ao
 * S3 / Cloudflare R2 usando as env vars AWS_* ou CF_R2_*.
 *
 * Serve arquivos via GET /api/uploads/:filename.
 */

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads')

// Garante que o diretório existe
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

declare module 'fastify' {
  interface FastifyInstance {
    saveFile(buffer: Buffer, originalName: string): Promise<string>  // retorna URL pública
    deleteFile(filename: string): Promise<void>
  }
}

export const storagePlugin: FastifyPluginAsync = fp(async (app) => {
  app.decorate('saveFile', async (buffer: Buffer, originalName: string): Promise<string> => {
    const ext  = path.extname(originalName).toLowerCase()
    const safe = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.dcm']
    if (ext && !safe.includes(ext)) throw new Error('Tipo de arquivo não permitido')

    const filename = `${Date.now()}-${crypto.randomUUID()}${ext}`
    const dest = path.join(UPLOAD_DIR, filename)
    fs.writeFileSync(dest, buffer)
    return `/api/uploads/${filename}`
  })

  app.decorate('deleteFile', async (filename: string): Promise<void> => {
    const dest = path.join(UPLOAD_DIR, filename)
    if (fs.existsSync(dest)) fs.unlinkSync(dest)
  })

  // Rota de serving de arquivos
  app.get<{ Params: { filename: string } }>('/uploads/:filename', async (req, reply) => {
    const { filename } = req.params
    // Sanitização: impede path traversal
    const safe = path.basename(filename)
    const dest  = path.join(UPLOAD_DIR, safe)

    if (!fs.existsSync(dest)) {
      return reply.status(404).send({ error: 'Arquivo não encontrado' })
    }

    const ext = path.extname(safe).toLowerCase()
    const mimeMap: Record<string, string> = {
      '.pdf':  'application/pdf',
      '.jpg':  'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png':  'image/png',
      '.gif':  'image/gif',
      '.webp': 'image/webp',
    }

    reply.header('Content-Type', mimeMap[ext] ?? 'application/octet-stream')
    reply.header('Cache-Control', 'private, max-age=86400')
    return reply.send(fs.createReadStream(dest))
  })
})
