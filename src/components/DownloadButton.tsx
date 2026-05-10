import styles from './DownloadButton.module.css';

interface Props {
  markdown: string;
  filename: string;
}

export default function DownloadButton({ markdown, filename }: Props) {
  if (!markdown) return null;

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
  };

  return (
    <div className={styles.container}>
      <button className={styles.download} onClick={handleDownload}>
        ダウンロード (.md)
      </button>
      <button className={styles.copy} onClick={handleCopy}>
        クリップボードにコピー
      </button>
    </div>
  );
}
