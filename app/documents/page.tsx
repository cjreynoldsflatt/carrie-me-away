import { getDocuments } from '@/lib/documents'
import DocumentsClient from './DocumentsClient'

export default function DocumentsPage() {
  return <DocumentsClient documents={getDocuments()} />
}
