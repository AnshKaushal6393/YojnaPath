function Card({ className = "", ...props }) {
  return (
    <div
      className={[
        "rounded-[28px] border border-white/10 bg-white/[0.06] shadow-[0_16px_40px_rgba(15,23,42,0.18)] backdrop-blur",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

function CardHeader({ className = "", ...props }) {
  return <div className={["p-6 pb-0", className].filter(Boolean).join(" ")} {...props} />;
}

function CardTitle({ className = "", ...props }) {
  return <h3 className={["text-2xl font-semibold text-white", className].filter(Boolean).join(" ")} {...props} />;
}

function CardDescription({ className = "", ...props }) {
  return <p className={["mt-2 text-sm text-slate-400", className].filter(Boolean).join(" ")} {...props} />;
}

function CardContent({ className = "", ...props }) {
  return <div className={["p-6", className].filter(Boolean).join(" ")} {...props} />;
}

function CardFooter({ className = "", ...props }) {
  return <div className={["p-6 pt-0", className].filter(Boolean).join(" ")} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };

