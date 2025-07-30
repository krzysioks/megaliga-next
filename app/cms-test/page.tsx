/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useRef, useState } from 'react';

export default function AdminPage() {
    const editorRef = useRef<any>(null);
    const [output, setOutput] = useState<any>(null);

    useEffect(() => {
        async function loadEditor() {
            const EditorJS = (await import('@editorjs/editorjs')).default;
            const Header = (await import('@editorjs/header')).default;
            const List = (await import('@editorjs/list')).default;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            const RawTool = (await import('@editorjs/raw')).default;
            const ImageTool = (await import('@editorjs/image')).default;

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
                    header: Header,
                    list: List,
                    raw: RawTool,
                    image: {
                        class: ImageTool,
                        config: {
                            endpoints: {
                                byFile: 'http://localhost:8008/uploadFile',
                                byUrl: 'http://localhost:8008/fetchUrl'
                            }
                        }
                    }
                }
            });
        }

        loadEditor();

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
            <div
                id="editorjs"
                style={{ border: '1px solid #ccc', padding: 16 }}
            />
            <button onClick={handleSave} style={{ marginTop: 16 }}>
                Zapisz treść
            </button>
            {output && (
                <pre
                    style={{
                        marginTop: 16,
                        background: '#f9f9f9',
                        padding: 16
                    }}
                >
                    {JSON.stringify(output, null, 2)}
                </pre>
            )}
        </div>
    );
}
