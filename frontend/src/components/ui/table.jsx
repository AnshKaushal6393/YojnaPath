function Table({ className = "", ...props }) {
  return <table className={["w-full caption-bottom text-sm", className].filter(Boolean).join(" ")} {...props} />;
}

function TableHeader({ className = "", ...props }) {
  return <thead className={["[&_tr]:border-b", className].filter(Boolean).join(" ")} {...props} />;
}

function TableBody({ className = "", ...props }) {
  return <tbody className={["[&_tr:last-child]:border-0", className].filter(Boolean).join(" ")} {...props} />;
}

function TableRow({ className = "", ...props }) {
  return (
    <tr
      className={["border-b border-white/6 transition-colors hover:bg-white/[0.03]", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

function TableHead({ className = "", ...props }) {
  return (
    <th
      className={[
        "h-12 px-4 text-left align-middle text-xs font-semibold uppercase tracking-[0.18em] text-slate-300",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

function TableCell({ className = "", ...props }) {
  return <td className={["px-4 py-4 align-top", className].filter(Boolean).join(" ")} {...props} />;
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };

