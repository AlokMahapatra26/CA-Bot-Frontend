import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const filename = req.nextUrl.searchParams.get('filename') || 'document';

  if (!url) {
    return new Response('Missing URL', { status: 400 });
  }

  try {
    const fileRes = await fetch(url);
    if (!fileRes.ok) {
      throw new Error('Failed to fetch file from storage');
    }

    const contentType = fileRes.headers.get('content-type') || 'application/octet-stream';
    const blob = await fileRes.blob();

    return new Response(blob, {
      headers: {
        'Content-Type': contentType,
        // Force file download with custom filename
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Download API Error:', error);
    return new Response(`Failed to download file: ${error.message}`, { status: 500 });
  }
}
