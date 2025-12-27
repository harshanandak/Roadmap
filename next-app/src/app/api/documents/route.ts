/**
 * Knowledge Documents API
 *
 * GET  /api/documents - List documents
 * POST /api/documents - Upload new document
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { DocumentDisplay, DocumentFileType } from '@/lib/types/knowledge'

/**
 * GET /api/documents
 *
 * List documents for the team.
 *
 * Query params:
 * - workspaceId: Filter by workspace
 * - collectionId: Filter by collection
 * - status: Filter by status
 * - search: Search by name
 * - limit: Max results (default: 50)
 * - offset: Pagination offset
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's team
    const { data: membership, error: memberError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const teamId = membership.team_id

    // Parse query params
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const collectionId = searchParams.get('collectionId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('knowledge_documents')
      .select(`
        id,
        name,
        description,
        file_type,
        file_size,
        file_url,
        status,
        processing_error,
        word_count,
        page_count,
        chunk_count,
        tags,
        visibility,
        collection_id,
        created_by,
        created_at,
        updated_at,
        collection:document_collections(name)
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }
    if (collectionId) {
      query = query.eq('collection_id', collectionId)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data: documents, error: queryError, count } = await query

    if (queryError) {
      console.error('[Documents API] Query error:', queryError)
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    // Transform to display format
    const displayDocuments: DocumentDisplay[] = (documents || []).map((doc) => ({
      id: doc.id,
      name: doc.name,
      description: doc.description,
      fileType: doc.file_type as DocumentFileType,
      fileSize: doc.file_size,
      fileUrl: doc.file_url,
      status: doc.status,
      processingError: doc.processing_error,
      wordCount: doc.word_count,
      pageCount: doc.page_count,
      chunkCount: doc.chunk_count || 0,
      tags: doc.tags || [],
      visibility: doc.visibility,
      collectionId: doc.collection_id,
      collectionName: Array.isArray(doc.collection) ? doc.collection[0]?.name : undefined,
      createdBy: doc.created_by,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    }))

    return NextResponse.json({
      documents: displayDocuments,
      count: displayDocuments.length,
      total: count,
    })
  } catch (error) {
    console.error('[Documents API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/documents
 *
 * Upload a new document.
 *
 * Request: FormData with:
 * - file: The document file
 * - name: Document name (optional, defaults to filename)
 * - description: Document description (optional)
 * - collectionId: Collection to add to (optional)
 * - workspaceId: Workspace scope (optional)
 * - tags: JSON array of tags (optional)
 * - visibility: 'private' | 'team' | 'workspace' (default: 'team')
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's team
    const { data: membership, error: memberError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const teamId = membership.team_id

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const name = formData.get('name') as string | null
    const description = formData.get('description') as string | null
    const collectionId = formData.get('collectionId') as string | null
    const workspaceId = formData.get('workspaceId') as string | null
    const tagsJson = formData.get('tags') as string | null
    const visibility = (formData.get('visibility') as string) || 'team'

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    // Validate file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase() as DocumentFileType
    const supportedTypes = ['pdf', 'docx', 'doc', 'md', 'txt', 'html', 'csv', 'json']

    if (!supportedTypes.includes(fileExtension)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${fileExtension}` },
        { status: 400 }
      )
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      )
    }

    // Parse tags
    let tags: string[] = []
    if (tagsJson) {
      try {
        tags = JSON.parse(tagsJson)
      } catch {
        // Ignore invalid tags
      }
    }

    // Generate document ID and storage path
    const documentId = Date.now().toString()
    const storagePath = `${teamId}/${documentId}/${file.name}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('knowledge-documents')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[Documents API] Upload error:', uploadError)
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL (or signed URL for private bucket)
    const { data: urlData } = supabase.storage
      .from('knowledge-documents')
      .getPublicUrl(storagePath)

    // Create document record
    const { data: document, error: insertError } = await supabase
      .from('knowledge_documents')
      .insert({
        id: documentId,
        team_id: teamId,
        workspace_id: workspaceId,
        collection_id: collectionId,
        name: name || file.name.replace(/\.[^.]+$/, ''),
        description,
        file_type: fileExtension,
        file_size: file.size,
        file_path: storagePath,
        file_url: urlData.publicUrl,
        source_type: 'upload',
        status: 'pending',
        tags,
        visibility,
        metadata: {
          originalName: file.name,
          mimeType: file.type,
        },
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      // Clean up uploaded file
      await supabase.storage.from('knowledge-documents').remove([storagePath])

      console.error('[Documents API] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 }
      )
    }

    // TODO: Trigger async processing (could use Supabase Edge Functions or background job)
    // For now, return the pending document

    return NextResponse.json(
      {
        document: {
          id: document.id,
          name: document.name,
          description: document.description,
          fileType: document.file_type,
          fileSize: document.file_size,
          fileUrl: document.file_url,
          status: document.status,
          tags: document.tags || [],
          visibility: document.visibility,
          createdAt: document.created_at,
        },
        message: 'Document uploaded. Processing will begin shortly.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Documents API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
