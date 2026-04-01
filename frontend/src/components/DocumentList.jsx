export default function DocumentList({ documents }) {
  if (!documents.length) {
    return null;
  }

  return (
    <div className="detail-card__section">
      <div className="detail-section__header">
        <h2 className="type-h2">Documents</h2>
        <p className="type-caption">Keep these ready before you begin the application.</p>
      </div>
      <div className="detail-card__documents">
        {documents.map((document, index) => (
          <div key={`${document.en}-${index}`} className="detail-card__document">
            <div className="detail-card__document-index type-micro">{String(index + 1).padStart(2, "0")}</div>
            <div className="detail-card__document-copy">
              {document.en ? <p className="type-body-en">{document.en}</p> : null}
              {document.hi ? (
                <p className="type-caption hi" lang="hi">
                  {document.hi}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
