/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef, useState } from 'react';

export const useCmsDemo = () => {
    const editorRef = useRef<any>(null);
    const [output, setOutput] = useState<any>(null);

    useEffect(() => {
        const loadEditor = async () => {
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
        };

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

    return { output, handleSave };
};
