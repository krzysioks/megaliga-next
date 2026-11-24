'use client';

import { useCmsDemo } from '@/components/cms-demo/batons/use-cms-demo';

export default function CmsDemo() {
    const { output, handleSave } = useCmsDemo();

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
                        color: '#272727',
                        padding: 16
                    }}
                >
                    {JSON.stringify(output, null, 2)}
                </pre>
            )}
        </div>
    );
}
