import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import MermaidBlock from './MermaidBlock';
import styles from './MarkdownPreview.module.css';

interface Props {
  markdown: string;
}

const components: Components = {
  code({ className, children }) {
    const lang = /language-(\w+)/.exec(className ?? '')?.[1];
    if (lang === 'mermaid') {
      return <MermaidBlock code={String(children).trim()} />;
    }
    return <code className={className}>{children}</code>;
  },
};

export default function MarkdownPreview({ markdown }: Props) {
  if (!markdown) return null;

  return (
    <div className={styles.container}>
      <div className={styles.pane}>
        <h3 className={styles.title}>Markdownテキスト</h3>
        <pre className={styles.raw}>{markdown}</pre>
      </div>
      <div className={styles.pane}>
        <h3 className={styles.title}>プレビュー</h3>
        <div className={styles.rendered}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {markdown}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
