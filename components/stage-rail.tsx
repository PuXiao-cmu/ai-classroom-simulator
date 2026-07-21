const stages = ["Prepare", "Meet the class", "Rehearse", "Classroom X-Ray"];

export function StageRail({ active }: { active: number }) {
  return (
    <nav className="stage-rail" aria-label="Rehearsal stages">
      {stages.map((stage, index) => (
        <div className={`stage-item ${index === active ? "active" : ""} ${index < active ? "complete" : ""}`} key={stage}>
          <span>{index < active ? "✓" : index + 1}</span>
          <em>{stage}</em>
        </div>
      ))}
    </nav>
  );
}
