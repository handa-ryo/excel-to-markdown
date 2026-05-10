import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import styles from './FileUpload.module.css';

interface Props {
  onFile: (file: File) => void;
}

export default function FileUpload({ onFile }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      className={`${styles.dropzone} ${dragging ? styles.dragging : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className={styles.hidden}
        onChange={handleChange}
      />
      <p>Excelファイルをここにドロップ<br />またはクリックして選択</p>
      <span className={styles.hint}>.xlsx / .xls</span>
    </div>
  );
}
