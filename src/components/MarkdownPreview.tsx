import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './MarkdownPreview.module.css';

interface Props {
  markdown: string;
}

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
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
