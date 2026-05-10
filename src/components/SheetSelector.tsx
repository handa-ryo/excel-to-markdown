import styles from './SheetSelector.module.css';

interface Props {
  sheetNames: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function SheetSelector({ sheetNames, selected, onChange }: Props) {
  if (sheetNames.length <= 1) return null;

  const toggle = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter((s) => s !== name));
    } else {
      onChange([...selected, name]);
    }
  };

  return (
    <div className={styles.container}>
      <p className={styles.label}>変換するシートを選択</p>
      <div className={styles.list}>
        {sheetNames.map((name) => (
          <label key={name} className={styles.item}>
            <input
              type="checkbox"
              checked={selected.includes(name)}
              onChange={() => toggle(name)}
            />
            {name}
          </label>
        ))}
      </div>
    </div>
  );
}
