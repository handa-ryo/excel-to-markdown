import { useState } from 'react';
import FileUpload from './components/FileUpload';
import SheetSelector from './components/SheetSelector';
import MarkdownPreview from './components/MarkdownPreview';
import DownloadButton from './components/DownloadButton';
import { parseExcel, generateMarkdown, type WorkbookData } from './utils/excelToMarkdown';
import styles from './App.module.css';

export default function App() {
  const [filename, setFilename] = useState('');
  const [workbookData, setWorkbookData] = useState<WorkbookData | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [error, setError] = useState('');

  const handleFile = async (file: File) => {
    setError('');
    try {
      const data = await parseExcel(file);
      setWorkbookData(data);
      setSelectedSheets(data.sheets.map((s) => s.name));
      setFilename(file.name.replace(/\.(xlsx|xls)$/i, '.md'));
    } catch {
      setError('Excelファイルの読み込みに失敗しました。');
    }
  };

  const markdown =
    workbookData && selectedSheets.length > 0
      ? generateMarkdown(workbookData, selectedSheets)
      : '';

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1>Excel → Markdown</h1>
        <p>ExcelファイルをMarkdownテーブルに変換します</p>
      </header>

      <main className={styles.main}>
        <FileUpload onFile={handleFile} />

        {error && <p className={styles.error}>{error}</p>}

        {workbookData && (
          <>
            <SheetSelector
              sheetNames={workbookData.sheets.map((s) => s.name)}
              selected={selectedSheets}
              onChange={setSelectedSheets}
            />
            <DownloadButton markdown={markdown} filename={filename} />
            <MarkdownPreview markdown={markdown} />
          </>
        )}
      </main>
    </div>
  );
}
