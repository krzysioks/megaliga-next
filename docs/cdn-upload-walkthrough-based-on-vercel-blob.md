# CDN Upload Walkthrough (Vercel Blob)

Here's the setup path for your project, using the client-upload approach (recommended since team logo files can be larger than the 4.5 MB server upload body limit).

## 4. Create the upload route (server-side authorization)

`app/api/logo/upload/route.ts`:

```ts
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async pathname => {
        // TODO: verify the session/JWT before allowing upload
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
          addRandomSuffix: true
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // update UserModel.logoUrl here once auth is wired in
      }
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
```

**Important**: `onBeforeGenerateToken` must verify the requesting user before returning a token, otherwise anyone can upload to your store.

## 5. Upload from the client

```tsx
'use client';

import { upload } from '@vercel/blob/client';

// on file input change/submit:
const blob = await upload(file.name, file, {
  access: 'public',
  handleUploadUrl: '/api/logo/upload'
});
// blob.url -> save this in UserModel via updateUser({ logoUrl: blob.url })
```

## 6. Allow the image host in Next.js

Since `logoUrl` gets rendered via `next/image`, add the Blob store's hostname to `next.config.ts`:

```ts
images: {
  remotePatterns: [
    { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }
  ];
}
```

## 7. Persist the URL

After upload succeeds, call your existing `updateUser` method:

```ts
await user.updateUser({ logoUrl: blob.url });
```
