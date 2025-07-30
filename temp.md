krzysioks: Can you propose free CMS content solution for my project? I do not need any rich in features framework, just a solution where user could add rich content using WYSIWIG as a cms block, that could be rendered on one of my projects routes

GitHub Copilot: For a simple, free CMS solution with WYSIWYG editing for your Next.js project, consider the following options:

1. **Netlify CMS**

   - Free, open-source, and easy to integrate.
   - Provides a WYSIWYG editor for rich content.
   - Stores content in your Git repository as Markdown or JSON.
   - You can render CMS content on any route by fetching and parsing these files.

2. **TinaCMS**

   - Free for self-hosted use.
   - Inline WYSIWYG editing, works well with Next.js.
   - Content is stored in your repo (Markdown/JSON).
   - Good for simple block-based content.

3. **Editor.js**
   - Not a full CMS, but a free, open-source block-style WYSIWYG editor.
   - You can build a simple admin page for content creation.
   - Store the output in your database or as JSON files, then render on your route.

**Recommended Approach:**  
If you want minimal setup and no external service, use Editor.js for the admin/editor page, save the content as JSON, and render it on your desired route. This gives you full control and keeps things simple.

Would you like a step-by-step guide or code sample for integrating Editor.js into your Next.js project?

krzysioks: yes

GitHub Copilot: Great! Here’s a step-by-step plan to add a simple CMS block with WYSIWYG editing using Editor.js in your Next.js project:

**1. Install Editor.js**
Run in your project directory:

```sh
npm install @editorjs/editorjs
```

**2. Create an Admin Page for Content Editing**
Add a new route (e.g., `/app/admin/page.tsx`) with Editor.js for WYSIWYG editing. On save, store the content as JSON (in MongoDB or a file).

**3. Create a Server Action to Save Content**
You can use your existing MongoDB setup in form-sa.ts as a template. Create a new server action (e.g., `saveContent`) to save the Editor.js output.

**4. Render the Content on a Public Route**
Fetch the saved JSON and render it using Editor.js or a simple renderer.

Would you like me to scaffold the admin page and server action for saving content? If yes, should the content be stored in MongoDB?

krzysioks: Does is support internationalization, I mean if I can change language of the WYSIWIG menu?

GitHub Copilot: Yes, Editor.js supports internationalization. You can change the language of the WYSIWYG menu by providing a `i18n` configuration when initializing Editor.js. There are built-in translations for several languages, and you can also provide custom translations for UI labels and tooltips.

If you need a specific language, you can set it up easily. Would you like an example of how to configure Editor.js with a different language?

krzysioks: Yes with Polish for instance

GitHub Copilot: Editor.js supports Polish language for its UI. You can set Polish by providing the `i18n` option when initializing Editor.js. Here’s a sample configuration:

```javascript
import EditorJS from '@editorjs/editorjs';

const editor = new EditorJS({
  // ...other config...
  i18n: {
    messages: {
      ui: {
        blockTunes: {
          toggler: 'Przełącznik'
        },
        inlineToolbar: {
          converter: 'Konwertuj'
        },
        toolbar: {
          toolbox: 'Narzędzia'
        }
        // Add more UI translations as needed
      },
      toolNames: {
        Text: 'Tekst',
        Heading: 'Nagłówek'
        // Add more tool names as needed
      },
      tools: {
        // Tool-specific translations
      }
    }
  }
});
```

You can use the official Polish translation from the Editor.js repository or customize the labels as needed.  
Would you like a full example for a Next.js page with Editor.js and Polish UI?

krzysioks: Ok, perfect now show me example of some rich content added by user using Editor.js WYSIWIG and example of code to rendered on app/form-test route

GitHub Copilot: Here’s an example of rich content a user might create with Editor.js (output as JSON), and how you can render it on your form-test route in Next.js.

---

### Example Editor.js Output (Rich Content JSON)

```json
{
  "time": 1690000000000,
  "blocks": [
    {
      "type": "header",
      "data": {
        "text": "Witamy w Megalidze!",
        "level": 2
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "To jest przykładowy blok tekstowy dodany przez użytkownika. <b>Możesz używać pogrubienia</b>, <i>kursywy</i> i innych stylów."
      }
    },
    {
      "type": "list",
      "data": {
        "style": "unordered",
        "items": ["Pierwszy punkt", "Drugi punkt", "Trzeci punkt"]
      }
    }
  ],
  "version": "2.28.2"
}
```

---

### Example Code to Render Content on page.tsx

You can create a simple renderer for Editor.js blocks. Here’s a basic example:

```tsx
// app/form-test/page.tsx
'use client';

import React from 'react';

// Example content (replace with fetched content from DB)
const editorContent = {
  time: 1690000000000,
  blocks: [
    {
      type: 'header',
      data: { text: 'Witamy w Megalidze!', level: 2 }
    },
    {
      type: 'paragraph',
      data: {
        text: 'To jest przykładowy blok tekstowy dodany przez użytkownika. <b>Możesz używać pogrubienia</b>, <i>kursywy</i> i innych stylów.'
      }
    },
    {
      type: 'list',
      data: {
        style: 'unordered',
        items: ['Pierwszy punkt', 'Drugi punkt', 'Trzeci punkt']
      }
    }
  ],
  version: '2.28.2'
};

function renderBlock(block: any) {
  switch (block.type) {
    case 'header':
      const Tag = `h${block.data.level}` as keyof JSX.IntrinsicElements;
      return <Tag key={block.data.text}>{block.data.text}</Tag>;
    case 'paragraph':
      return (
        <p
          key={block.data.text}
          dangerouslySetInnerHTML={{ __html: block.data.text }}
        />
      );
    case 'list':
      return block.data.style === 'unordered' ? (
        <ul key={block.data.items.join(',')}>
          {block.data.items.map((item: string, idx: number) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      ) : (
        <ol key={block.data.items.join(',')}>
          {block.data.items.map((item: string, idx: number) => (
            <li key={idx}>{item}</li>
          ))}
        </ol>
      );
    default:
      return null;
  }
}

export default function FormTestPage() {
  return <div>{editorContent.blocks.map(renderBlock)}</div>;
}
```

---

You can replace `editorContent` with content fetched from your database.  
Let me know if you want help with fetching and saving content!

krzysioks: Ok, perfect I got the point, now please show me example of simple admin panel page where I can add WYSIWIG editor of Editor.js package

GitHub Copilot: Here’s a simple example of an admin panel page in Next.js with Editor.js as a WYSIWYG editor. This page lets you add rich content and view/save the output.

Create a new file: `app/admin/page.tsx`

```tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import EditorJS from '@editorjs/editorjs';

export default function AdminPage() {
  const editorRef = useRef<EditorJS | null>(null);
  const [output, setOutput] = useState<any>(null);

  useEffect(() => {
    if (!editorRef.current) {
      editorRef.current = new EditorJS({
        holder: 'editorjs',
        i18n: {
          messages: {
            ui: {
              blockTunes: { toggler: 'Przełącznik' },
              inlineToolbar: { converter: 'Konwertuj' },
              toolbar: { toolbox: 'Narzędzia' }
            },
            toolNames: {
              Text: 'Tekst',
              Heading: 'Nagłówek'
            },
            tools: {}
          }
        },
        tools: {
          header: require('@editorjs/header'),
          list: require('@editorjs/list'),
          paragraph: require('@editorjs/paragraph')
        }
      });
    }
    return () => {
      editorRef.current?.destroy();
      editorRef.current = null;
    };
  }, []);

  const handleSave = async () => {
    if (editorRef.current) {
      const savedData = await editorRef.current.save();
      setOutput(savedData);
      // Here you can send savedData to your server/database
    }
  };

  return (
    <div>
      <h1>Panel administratora – Edytor treści</h1>
      <div id="editorjs" style={{ border: '1px solid #ccc', padding: 16 }} />
      <button onClick={handleSave} style={{ marginTop: 16 }}>
        Zapisz treść
      </button>
      {output && (
        <pre style={{ marginTop: 16, background: '#f9f9f9', padding: 16 }}>
          {JSON.stringify(output, null, 2)}
        </pre>
      )}
    </div>
  );
}
```

**Notes:**

- You may need to install Editor.js tools:

  ```sh
  npm install @editorjs/header @editorjs/list @editorjs/paragraph
  ```

- This example shows the saved JSON below the editor. You can send it to your backend for storage.

Let me know if you want help with saving to MongoDB or rendering the saved content!
