export function WorkflowAside({
  title,
  steps,
  note,
}: {
  title: string;
  steps: string[];
  note: string;
}) {
  return (
    <aside className="form-aside">
      <h2>{title}</h2>
      <ol>
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="form-note">{note}</p>
    </aside>
  );
}
