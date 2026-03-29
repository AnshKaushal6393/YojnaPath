import SchemeCard from "./SchemeCard";

const RECENT_MATCHES = [
  {
    id: "pm-kisan",
    schemeName: "PM Kisan Samman Nidhi",
    schemeNameHi: "पीएम किसान सम्मान निधि",
    benefitAmount: "₹6,000 / year",
    category: "agriculture",
    ministry: "Ministry of Agriculture",
    matchStatus: "matched",
    description: "Income support for eligible farming households with direct transfer benefit.",
    descriptionHi: "पात्र किसान परिवारों के लिए प्रत्यक्ष आय सहायता उपलब्ध कराई जाती है।",
  },
  {
    id: "pmjay",
    schemeName: "Ayushman Bharat PM-JAY",
    schemeNameHi: "आयुष्मान भारत पीएम-जेएवाई",
    benefitAmount: "₹5,00,000 cover",
    category: "health",
    ministry: "Ministry of Health and Family Welfare",
    matchStatus: "near-miss",
    description: "Health insurance support for eligible families through empanelled hospitals.",
    descriptionHi: "पात्र परिवारों के लिए सूचीबद्ध अस्पतालों के माध्यम से स्वास्थ्य बीमा सहायता उपलब्ध है।",
  },
];

export default function RecentMatches({ openCard, onToggle }) {
  return (
    <section className="home-section">
      <div className="section-heading">
        <h2 className="type-h2">Recent matches</h2>
        <p className="type-caption">Based on your latest saved profile and recent search history.</p>
      </div>

      <div className="recent-matches">
        {RECENT_MATCHES.map((scheme, index) => (
          <SchemeCard
            key={scheme.id}
            schemeName={scheme.schemeName}
            schemeNameHi={scheme.schemeNameHi}
            benefitAmount={scheme.benefitAmount}
            category={scheme.category}
            ministry={scheme.ministry}
            matchStatus={scheme.matchStatus}
            description={scheme.description}
            descriptionHi={scheme.descriptionHi}
            staggerIndex={index}
            isOpen={openCard === scheme.id}
            onToggle={() => onToggle((current) => (current === scheme.id ? "" : scheme.id))}
          />
        ))}
      </div>
    </section>
  );
}
