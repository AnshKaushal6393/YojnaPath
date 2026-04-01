import { useMemo, useState } from "react";

function downloadChecklist(name, items) {
  const lines = [name, "", ...items.map((item) => `- [ ] ${item}`)];
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = `${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-checklist.txt`;
  link.click();
  URL.revokeObjectURL(href);
}

export default function ChecklistGenerator({ schemeName, documents, eligibilityItems }) {
  const checklistItems = useMemo(() => {
    const documentItems = documents.map((document) => document.en || document.hi).filter(Boolean);
    return [...eligibilityItems, ...documentItems];
  }, [documents, eligibilityItems]);
  const [checkedItems, setCheckedItems] = useState([]);

  if (!checklistItems.length) {
    return null;
  }

  function toggleItem(item) {
    setCheckedItems((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item]
    );
  }

  return (
    <div className="detail-card__section">
      <div className="detail-section__header">
        <h2 className="type-h2">Checklist generator</h2>
        <p className="type-caption">
          Track what is ready now and download a simple checklist for later.
        </p>
      </div>
      <div className="detail-checklist">
        {checklistItems.map((item, index) => {
          const isChecked = checkedItems.includes(item);
          return (
            <label
              key={`${index}-${item}`}
              className={`detail-checklist__item ${isChecked ? "is-checked" : ""}`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleItem(item)}
              />
              <span className="type-body-en">{item}</span>
            </label>
          );
        })}
      </div>
      <button
        type="button"
        className="detail-card__secondary-button"
        onClick={() => downloadChecklist(schemeName, checklistItems)}
      >
        Download checklist
      </button>
    </div>
  );
}
