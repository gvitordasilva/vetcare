'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PortalRootPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/portal/meus-pets') }, [])
  return null
}
