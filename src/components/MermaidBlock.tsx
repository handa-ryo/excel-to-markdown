import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'default' });

let idCounter = 0;

interface Props {
  code: string;
}

export default function MermaidBlock({ code }: Props) {
  const [svg, setSvg] = useState('');
  const [renderError, setRenderError] = useState(false);
  const idRef = useRef(`mermaid-${++idCounter}`);

  useEffect(() => {
    let cancelled = false;
    idRef.current = `mermaid-${++idCounter}`;

    mermaid
      .render(idRef.current, code)
      .then(({ svg: rendered }) => {
        if (!cancelled) {
          setSvg(rendered);
          setRenderError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setRenderError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (renderError) return <pre style={{ fontSize: '0.8rem' }}>{code}</pre>;
  if (!svg) return null;
  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}
